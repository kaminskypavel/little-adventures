import { beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Database } from "@little-adventures/db";
import { relations } from "@little-adventures/db/relations";
import { waitlist } from "@little-adventures/db/schema/index";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";
import { TRPCError } from "@trpc/server";
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

describe("waitlist.join", () => {
	let db: Awaited<ReturnType<typeof freshDb>>;
	let caller: ReturnType<typeof appRouter.createCaller>;

	beforeEach(async () => {
		db = await freshDb();
		// The PGlite db and the Neon db share the query API but not the type.
		caller = appRouter.createCaller({
			art: {} as ImageEditing,
			db: db as unknown as Database,
			isBeta: () => true,
			principal: null,
			storage: {} as Storage,
			voice: {} as Transcription,
			waitUntil: () => undefined,
		});
	});

	test("stores one row with the email trimmed, lowercased and the right platform", async () => {
		const result = await caller.waitlist.join({
			email: "  Test@Example.com ",
			platform: "ios",
		});
		expect(result).toEqual({ ok: true });
		const rows = await db.select().from(waitlist);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.email).toBe("test@example.com");
		expect(rows[0]?.platform).toBe("ios");
	});

	test("an email alone is enough", async () => {
		expect(await caller.waitlist.join({ email: "parent@example.com" })).toEqual(
			{ ok: true }
		);
		const rows = await db.select().from(waitlist);
		expect(rows[0]?.platform).toBeNull();
	});

	test("joining again with the same email in another case is a silent no-op", async () => {
		await caller.waitlist.join({ email: "test@example.com", platform: "ios" });
		const again = await caller.waitlist.join({
			email: "TEST@example.com",
			platform: "android",
		});
		expect(again).toEqual({ ok: true });
		expect(await db.select().from(waitlist)).toHaveLength(1);
	});

	test("a bad email is rejected with BAD_REQUEST and stores nothing", async () => {
		const error = await caller.waitlist
			.join({ email: "nope", platform: "ios" })
			.catch((e) => e);
		expect(error).toBeInstanceOf(TRPCError);
		expect(error.code).toBe("BAD_REQUEST");
		expect(await db.select().from(waitlist)).toHaveLength(0);
	});
});
