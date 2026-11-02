import { beforeEach, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Database } from "@little-adventures/db";
import { relations } from "@little-adventures/db/relations";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";
import { drizzle } from "drizzle-orm/pglite";

import { isBetaMember } from "./beta";
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
	return drizzle({ client, relations }) as unknown as Database;
}

let db: Database;
beforeEach(async () => {
	db = await freshDb();
});

// As in production: the email list is empty here, so only members are in.
const callerFor = (userId: string) =>
	appRouter.createCaller({
		art: {} as ImageEditing,
		db,
		inviteMatches: (code) => code.trim().toLowerCase() === "moon-whale",
		isBeta: ({ user }) => isBetaMember(db, user.id),
		principal: { user: { email: `${userId}@judges.test`, id: userId } },
		storage: {} as Storage,
		voice: {} as Transcription,
		waitUntil: () => undefined,
	});

test("the invite code lets a signed-in grown-up into the beta, once is enough", async () => {
	const judge = callerFor("judge-1");
	expect(await judge.beta.status()).toEqual({ member: false });
	await expect(judge.child.mine()).rejects.toThrow("private beta");
	expect(await judge.beta.join({ code: " Moon-Whale " })).toEqual({ ok: true });
	expect(await judge.beta.join({ code: "moon-whale" })).toEqual({ ok: true });
	expect(await judge.beta.status()).toEqual({ member: true });
	expect(await judge.child.mine()).toEqual([]);
});

test("a wrong code is refused and lets nobody in", async () => {
	const stranger = callerFor("stranger");
	await expect(stranger.beta.join({ code: "sun-whale" })).rejects.toThrow(
		"That code did not work"
	);
	expect(await stranger.beta.status()).toEqual({ member: false });
});
