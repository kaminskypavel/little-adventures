import { beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Database } from "@little-adventures/db";
import { relations } from "@little-adventures/db/relations";
import type { Storage } from "@little-adventures/storage";
import { drizzle } from "drizzle-orm/pglite";

import { appRouter } from "./index";

const migrationsDir = join(import.meta.dirname, "../../../db/src/migrations");

// Applies the generated migration files to a fresh in-memory Postgres.
async function freshDb() {
	const client = new PGlite();
	const sql = readdirSync(migrationsDir)
		.sort()
		.map((name) =>
			readFileSync(join(migrationsDir, name, "migration.sql"), "utf8")
		)
		.join("\n");
	await client.exec(sql);
	return drizzle({ client, relations });
}

const noah = { age: 5, kind: "boy", name: "Noah" } as const;

describe("child", () => {
	let db: Database;
	const callerFor = (userId: string) =>
		appRouter.createCaller({
			// The PGlite db and the Neon db share the query API but not the type.
			db,
			principal: { user: { id: userId } },
			storage: {} as Storage,
		});

	beforeEach(async () => {
		db = (await freshDb()) as unknown as Database;
	});

	test("save adds a child with the defaults; mine lists it", async () => {
		const row = await callerFor("u1").child.save(noah);
		expect(row).toMatchObject({
			...noah,
			grownUp: false,
			look: "clay",
			ownerId: "u1",
			photoKey: null,
			puppy: false,
		});
		expect(await callerFor("u1").child.mine()).toEqual([row]);
	});

	test("save with an id updates only the given fields", async () => {
		const first = await callerFor("u1").child.save(noah);
		const updated = await callerFor("u1").child.save({
			...noah,
			id: first.id,
			name: "Noa",
			puppy: true,
		});
		expect(updated).toMatchObject({ id: first.id, name: "Noa", puppy: true });
		expect(await callerFor("u1").child.mine()).toHaveLength(1);
	});

	test("an id that is not the caller's is NOT_FOUND and changes nothing", async () => {
		const theirs = await callerFor("u2").child.save(noah);
		const error = await callerFor("u1")
			.child.save({ ...noah, id: theirs.id, name: "Mine now" })
			.catch((e) => e);
		expect(error.code).toBe("NOT_FOUND");
		expect(await callerFor("u2").child.mine()).toEqual([theirs]);
		expect(await callerFor("u1").child.mine()).toEqual([]);
	});

	test("a photo key outside the caller's prefix is FORBIDDEN", async () => {
		const error = await callerFor("u1")
			.child.save({
				...noah,
				photoKey: "little-adventures/users/u2/photos/a.jpg",
			})
			.catch((e) => e);
		expect(error.code).toBe("FORBIDDEN");
		const own = await callerFor("u1").child.save({
			...noah,
			photoKey: "little-adventures/users/u1/photos/a.jpg",
		});
		expect(own.photoKey).toBe("little-adventures/users/u1/photos/a.jpg");
	});

	test("a bad age is BAD_REQUEST", async () => {
		const error = await callerFor("u1")
			.child.save({ ...noah, age: 40 })
			.catch((e) => e);
		expect(error.code).toBe("BAD_REQUEST");
	});
});

describe("photo.delete", () => {
	let db: Database;
	const deleted: string[] = [];
	const storage = {
		deleteObject: (key: string) => {
			deleted.push(key);
			return Promise.resolve();
		},
	} as unknown as Storage;
	const callerFor = (userId: string) =>
		appRouter.createCaller({
			db,
			principal: { user: { id: userId } },
			storage,
		});
	const photo = "little-adventures/users/u1/photos/a.jpg";

	beforeEach(async () => {
		db = (await freshDb()) as unknown as Database;
		deleted.length = 0;
	});

	test("deletes the object and clears the key", async () => {
		const child = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		expect(await callerFor("u1").photo.delete({ childId: child.id })).toEqual({
			ok: true,
		});
		expect(deleted).toEqual([photo]);
		const [after] = await callerFor("u1").child.mine();
		expect(after?.photoKey).toBeNull();
	});

	test("another user's child is NOT_FOUND and storage is untouched", async () => {
		const theirs = await callerFor("u2").child.save({
			...noah,
			photoKey: "little-adventures/users/u2/photos/a.jpg",
		});
		const error = await callerFor("u1")
			.photo.delete({ childId: theirs.id })
			.catch((e) => e);
		expect(error.code).toBe("NOT_FOUND");
		expect(deleted).toEqual([]);
		const [still] = await callerFor("u2").child.mine();
		expect(still?.photoKey).toBe(theirs.photoKey);
	});

	test("a child without a photo is ok and storage is untouched", async () => {
		const child = await callerFor("u1").child.save(noah);
		expect(await callerFor("u1").photo.delete({ childId: child.id })).toEqual({
			ok: true,
		});
		expect(deleted).toEqual([]);
	});
});
