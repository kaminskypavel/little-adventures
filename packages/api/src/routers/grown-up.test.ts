import { beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Database } from "@little-adventures/db";
import { relations } from "@little-adventures/db/relations";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";
import { drizzle } from "drizzle-orm/pglite";

import { appRouter } from "./index";

const migrationsDir = join(import.meta.dirname, "../../../db/src/migrations");

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

describe("grownUp", () => {
	let db: Database;
	let objects: Set<string>;
	const storage = {
		deleteObject: (key: string) => {
			objects.delete(key);
			return Promise.resolve();
		},
		deletePrefix: (prefix: string) => {
			for (const key of objects) {
				if (key.startsWith(prefix)) {
					objects.delete(key);
				}
			}
			return Promise.resolve();
		},
		readUrl: (key: string) => Promise.resolve(`https://files.test/${key}`),
	} as unknown as Storage;
	const callerFor = (userId: string) =>
		appRouter.createCaller({
			art: { isConfigured: false } as ImageEditing,
			db,
			principal: { user: { id: userId } },
			storage,
			voice: {} as Transcription,
			waitUntil: () => undefined,
		});

	const photoA = "little-adventures/users/u1/photos/a.jpg";
	const photoB = "little-adventures/users/u1/photos/b.jpg";
	const folderA = "little-adventures/users/u1/grown-up/art/a/";
	const folderB = "little-adventures/users/u1/grown-up/art/b/";

	beforeEach(async () => {
		db = (await freshDb()) as unknown as Database;
		objects = new Set();
	});

	test("saving the caller's own photo key creates the row; mine reads it", async () => {
		expect(await callerFor("u1").grownUp.mine()).toBeNull();
		await callerFor("u1").grownUp.save({ photoKey: photoA });
		expect(await callerFor("u1").grownUp.mine()).toMatchObject({
			ownerId: "u1",
			photoKey: photoA,
			photoUrl: `https://files.test/${photoA}`,
		});
		expect(await callerFor("u2").grownUp.mine()).toBeNull();
	});

	test("another user's key is FORBIDDEN", async () => {
		const error = await callerFor("u1")
			.grownUp.save({ photoKey: "little-adventures/users/u2/photos/a.jpg" })
			.catch((e) => e);
		expect(error.code).toBe("FORBIDDEN");
		expect(await callerFor("u1").grownUp.mine()).toBeNull();
	});

	test("replacing the photo deletes the old photo and everything under its art folder", async () => {
		await callerFor("u1").grownUp.save({ photoKey: photoA });
		objects.add(photoA);
		objects.add(`${folderA}face.png`);
		objects.add(`${folderA}looks/clay.png`);
		objects.add(`${folderB}face.png`);
		await callerFor("u1").grownUp.save({ photoKey: photoB });
		expect([...objects]).toEqual([`${folderB}face.png`]);
		expect((await callerFor("u1").grownUp.mine())?.photoKey).toBe(photoB);
	});

	test("deleting clears the row, the photo and everything under its art folder", async () => {
		await callerFor("u1").grownUp.save({ photoKey: photoA });
		objects.add(photoA);
		objects.add(`${folderA}face.png`);
		objects.add(`${folderA}looks/clay.png`);
		objects.add("little-adventures/users/u1/photos/other.jpg");
		await callerFor("u1").grownUp.delete();
		expect(await callerFor("u1").grownUp.mine()).toBeNull();
		expect([...objects]).toEqual([
			"little-adventures/users/u1/photos/other.jpg",
		]);
	});
});
