import { beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createDb } from "@little-adventures/db";
import { waitlist } from "@little-adventures/db/schema/index";
import { TRPCError } from "@trpc/server";

import { appRouter } from "./index";

const migrationsDir = join(import.meta.dirname, "../../../db/src/migrations");

// Applies the generated migration files to a fresh in-memory database.
async function freshDb() {
	const db = createDb({ DATABASE_URL: ":memory:" });
	const sql = readdirSync(migrationsDir)
		.sort()
		.map((name) =>
			readFileSync(join(migrationsDir, name, "migration.sql"), "utf8")
		)
		.join("\n");
	await db.$client.executeMultiple(sql);
	return db;
}

describe("waitlist.join", () => {
	let db: Awaited<ReturnType<typeof freshDb>>;
	let caller: ReturnType<typeof appRouter.createCaller>;

	beforeEach(async () => {
		db = await freshDb();
		caller = appRouter.createCaller({ db });
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
