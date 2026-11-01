import { beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Database } from "@little-adventures/db";
import { relations } from "@little-adventures/db/relations";
import { aiCalls } from "@little-adventures/db/schema/index";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";
import { drizzle } from "drizzle-orm/pglite";

import { drawArt } from "../art";
import type { Context } from "../context";
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
			art: { isConfigured: false } as ImageEditing,
			db,
			principal: { user: { id: userId } },
			storage: {} as Storage,
			voice: {} as Transcription,
			waitUntil: () => undefined,
		});

	beforeEach(async () => {
		db = (await freshDb()) as unknown as Database;
	});

	test("save adds a child with the defaults; mine lists it", async () => {
		const row = await callerFor("u1").child.save(noah);
		expect(row).toMatchObject({
			...noah,
			artStatus: "idle",
			drawings: {},
			faceKey: null,
			grownUp: false,
			look: "clay",
			ownerId: "u1",
			photoKey: null,
			puppy: false,
		});
		expect(await callerFor("u1").child.mine()).toEqual([
			{ ...row, drawingUrls: {}, faceUrl: null },
		]);
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
		expect(await callerFor("u2").child.mine()).toEqual([
			{ ...theirs, drawingUrls: {}, faceUrl: null },
		]);
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
		deletePrefix: () => Promise.resolve(),
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

// A 1 x 1 png: the smallest real photo the face cutout can read.
const TINY_PNG =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("child art", () => {
	let db: Database;
	let pending: Promise<unknown>[];
	let put: string[];
	let deleted: string[];
	let stored: Set<string>;
	let segmentCalls: number;
	let failLook: string | null;
	let configured: boolean;
	let beforeSegment: (() => Promise<unknown>) | null;

	const photo = "little-adventures/users/u1/photos/a.jpg";
	const newer = "little-adventures/users/u1/photos/b.jpg";
	const storage = {
		deleteObject: (key: string) => {
			deleted.push(key);
			stored.delete(key);
			return Promise.resolve();
		},
		deletePrefix: (prefix: string) => {
			for (const key of stored) {
				if (key.startsWith(prefix)) {
					stored.delete(key);
				}
			}
			return Promise.resolve();
		},
		putObject: (input: { key: string }) => {
			put.push(input.key);
			stored.add(input.key);
			return Promise.resolve();
		},
		readUrl: (key: string) =>
			Promise.resolve(
				key.includes("/photos/")
					? `data:image/png;base64,${TINY_PNG}`
					: `https://files.test/${key}`
			),
	} as unknown as Storage;
	const art = {
		get isConfigured() {
			return configured;
		},
		redraw: ({ prompt }: { prompt: string }) => {
			if (failLook && prompt.includes(failLook)) {
				return Promise.reject(new Error("model said no"));
			}
			return Promise.resolve(new Uint8Array([1, 2, 3]));
		},
		segment: async () => {
			segmentCalls += 1;
			const hook = beforeSegment;
			beforeSegment = null;
			await hook?.();
			return {
				box: { x1: 0, x2: 1, y1: 0, y2: 1 },
				mask: new Uint8Array([1]),
				maskHeight: 1,
				maskWidth: 1,
			};
		},
	} as unknown as ImageEditing;
	const callerFor = (userId: string) =>
		appRouter.createCaller({
			art,
			db,
			principal: { user: { id: userId } },
			storage,
			voice: {} as Transcription,
			waitUntil: (work) => {
				pending.push(work);
			},
		} satisfies Context);
	const settle = () => Promise.all(pending);
	const folder = "little-adventures/users/u1/children/";

	beforeEach(async () => {
		db = (await freshDb()) as unknown as Database;
		pending = [];
		put = [];
		deleted = [];
		stored = new Set();
		segmentCalls = 0;
		failLook = null;
		configured = true;
		beforeSegment = null;
	});

	test("a new photo draws the face and three looks after the response", async () => {
		const saved = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		expect(saved.artStatus).toBe("working");
		await settle();
		const [child] = await callerFor("u1").child.mine();
		expect(child?.artStatus).toBe("ready");
		expect(child?.faceUrl).toBe(
			`https://files.test/${folder}${saved.id}/art/a/face.png`
		);
		expect(Object.keys(child?.drawingUrls ?? {}).sort()).toEqual([
			"clay",
			"felt",
			"wood",
		]);
		expect(put).toHaveLength(4);
		const calls = await db.select().from(aiCalls);
		expect(calls.map((call) => call.operation).sort()).toEqual([
			"face.segment",
			"look.clay",
			"look.felt",
			"look.wood",
		]);
		expect(calls.every((call) => call.ok && call.ownerId === "u1")).toBe(true);
	});

	test("saving the same photo again draws nothing", async () => {
		const saved = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		await callerFor("u1").child.save({
			...noah,
			id: saved.id,
			photoKey: photo,
		});
		expect(pending).toHaveLength(1);
		expect(segmentCalls).toBe(1);
	});

	test("without a model key the child stays idle and nothing is called", async () => {
		configured = false;
		const saved = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		expect(saved.artStatus).toBe("idle");
		expect(pending).toEqual([]);
		expect(segmentCalls).toBe(0);
	});

	test("a failed look is recorded, the rest is kept, and the child is failed", async () => {
		failLook = "felt";
		await callerFor("u1").child.save({ ...noah, photoKey: photo });
		await settle();
		const [child] = await callerFor("u1").child.mine();
		expect(child?.artStatus).toBe("failed");
		expect(Object.keys(child?.drawingUrls ?? {}).sort()).toEqual([
			"clay",
			"wood",
		]);
		expect(child?.faceUrl).not.toBeNull();
		const calls = await db.select().from(aiCalls);
		const felt = calls.find((call) => call.operation === "look.felt");
		expect(felt).toMatchObject({ costMicroUsd: 0, ok: false });
		expect(felt?.error).toContain("model said no");
	});

	test("replacing the photo deletes the old photo object", async () => {
		const first = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		stored.add(photo);
		await callerFor("u1").child.save({
			...noah,
			id: first.id,
			photoKey: newer,
		});
		await settle();
		expect(deleted).toContain(photo);
		expect(stored.has(photo)).toBe(false);
	});

	test("a newer photo's art is never overwritten by an older run", async () => {
		const first = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		await callerFor("u1").child.save({
			...noah,
			id: first.id,
			photoKey: newer,
		});
		// The older run starts late: its photo key no longer matches.
		const before = segmentCalls;
		await drawArt(
			{ art, db, storage },
			{ childId: first.id, ownerId: "u1", photoKey: photo }
		);
		expect(segmentCalls).toBe(before);
	});

	test("an older run still drawing when the photo changes leaves the newer art alone", async () => {
		const first = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		// The photo changes while the first run is still drawing.
		beforeSegment = () =>
			callerFor("u1").child.save({ ...noah, id: first.id, photoKey: newer });
		await settle();
		await settle();
		const [child] = await callerFor("u1").child.mine();
		expect(child).toMatchObject({ artStatus: "ready", photoKey: newer });
		expect(child?.faceUrl).toBe(
			`https://files.test/${folder}${first.id}/art/b/face.png`
		);
		const older = `${folder}${first.id}/art/a/`;
		expect([...new Set(deleted)].sort()).toEqual(
			[
				photo,
				`${older}face.png`,
				`${older}looks/clay.png`,
				`${older}looks/felt.png`,
				`${older}looks/wood.png`,
			].sort()
		);
	});

	test("a new photo removes the old photo's art", async () => {
		const first = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		await callerFor("u1").child.save({
			...noah,
			id: first.id,
			photoKey: newer,
		});
		await settle();
		const older = `${folder}${first.id}/art/a/`;
		expect(deleted.sort()).toEqual(
			[
				photo,
				`${older}face.png`,
				`${older}looks/clay.png`,
				`${older}looks/felt.png`,
				`${older}looks/wood.png`,
			].sort()
		);
	});

	test("a new photo removes every object in the old photo's art folder", async () => {
		const first = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		const older = `${folder}${first.id}/art/a/`;
		stored.add(`${older}extra/file.png`);
		await callerFor("u1").child.save({
			...noah,
			id: first.id,
			photoKey: newer,
		});
		await settle();
		expect([...stored].filter((key) => key.startsWith(older))).toEqual([]);
		expect(stored.has(`${folder}${first.id}/art/b/face.png`)).toBe(true);
	});

	test("photo.delete removes everything under the photo's art folder", async () => {
		const saved = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		const extra = `${folder}${saved.id}/art/a/extra/file.png`;
		stored.add(extra);
		await callerFor("u1").photo.delete({ childId: saved.id });
		expect(stored.has(extra)).toBe(false);
	});

	test("photo.delete removes the face and looks too and resets the art", async () => {
		const saved = await callerFor("u1").child.save({
			...noah,
			photoKey: photo,
		});
		await settle();
		await callerFor("u1").photo.delete({ childId: saved.id });
		expect(deleted.sort()).toEqual(
			[
				photo,
				`${folder}${saved.id}/art/a/face.png`,
				`${folder}${saved.id}/art/a/looks/clay.png`,
				`${folder}${saved.id}/art/a/looks/felt.png`,
				`${folder}${saved.id}/art/a/looks/wood.png`,
			].sort()
		);
		const [child] = await callerFor("u1").child.mine();
		expect(child).toMatchObject({
			artStatus: "idle",
			drawingUrls: {},
			faceUrl: null,
			photoKey: null,
		});
	});
});
