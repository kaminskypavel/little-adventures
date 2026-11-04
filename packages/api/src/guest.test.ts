import { beforeAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { GUEST_EMAIL } from "@little-adventures/auth/guest";
import type { Database } from "@little-adventures/db";
import { relations } from "@little-adventures/db/relations";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";
import { drizzle } from "drizzle-orm/pglite";

import type { Context } from "./context";
import { GUEST_READ_ONLY } from "./index";
import { appRouter } from "./routers/index";

const migrationsDir = join(import.meta.dirname, "../../db/src/migrations");

const id = "6f1c1c3e-62a3-4b1d-9a43-0c9f7a1e0001";

describe("guest account is read only", () => {
	let db: Database;

	beforeAll(async () => {
		const client = new PGlite();
		await client.exec(
			readdirSync(migrationsDir)
				.sort()
				.map((name) =>
					readFileSync(join(migrationsDir, name, "migration.sql"), "utf8")
				)
				.join("\n")
		);
		db = drizzle({ client, relations }) as unknown as Database;
	});

	const callerFor = (email: string) =>
		appRouter.createCaller({
			art: { isConfigured: false } as ImageEditing,
			db,
			isBeta: () => true,
			principal: { user: { email, id: "u1" } },
			storage: {} as Storage,
			voice: {} as Transcription,
			waitUntil: () => undefined,
		} satisfies Context);

	test("refuses every owner write with GUEST_READ_ONLY", async () => {
		const guest = callerFor(GUEST_EMAIL);
		const calls = [
			() => guest.child.save({ age: 5, kind: "boy", name: "Noah" }),
			() => guest.child.delete({ id }),
			() => guest.grownUp.save({ photoKey: "k" }),
			() => guest.grownUp.delete(),
			() =>
				guest.grownUp.setCalled({
					name: "Mom",
					pronoun: "she",
					relation: "mother",
				}),
			() => guest.photo.uploadUrl({ contentType: "image/jpeg", size: 10 }),
			() => guest.photo.delete({ childId: id }),
		];
		const results = await Promise.allSettled(calls.map((call) => call()));
		for (const result of results) {
			expect(result).toMatchObject({
				reason: { code: "FORBIDDEN", message: GUEST_READ_ONLY },
				status: "rejected",
			});
		}
	});

	test("lets the guest read and transcribe", async () => {
		const guest = callerFor(GUEST_EMAIL.toUpperCase());
		expect(await guest.child.mine()).toEqual([]);
		expect(await guest.grownUp.mine()).toBeNull();
		// Bad audio is a BAD_REQUEST from the handler, so the guard let the call through.
		await expect(
			guest.voice.transcribe({ audioBase64: "AAAA" })
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("lets a normal member write", async () => {
		const member = callerFor("pavel@example.com");
		await expect(member.child.delete({ id })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});
