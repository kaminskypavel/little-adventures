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

import type { Context } from "../context";
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

/** A mono 16-bit 16 kHz WAV of silence, as base64. */
function wavBase64(seconds: number): string {
	const dataSize = Math.round(seconds * 16_000) * 2;
	const bytes = new Uint8Array(44 + dataSize);
	const view = new DataView(bytes.buffer);
	bytes.set(new TextEncoder().encode("RIFF"), 0);
	view.setUint32(4, 36 + dataSize, true);
	bytes.set(new TextEncoder().encode("WAVEfmt "), 8);
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, 16_000, true);
	view.setUint32(28, 32_000, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	bytes.set(new TextEncoder().encode("data"), 36);
	view.setUint32(40, dataSize, true);
	return Buffer.from(bytes).toString("base64");
}

describe("voice.transcribe", () => {
	let db: Database;
	let requests: number;
	let fail: boolean;

	const voice = {
		isConfigured: true,
		transcribe: ({ audio }: { audio: Uint8Array }) => {
			requests += 1;
			if (fail) {
				return Promise.reject(new Error("meta said no"));
			}
			return Promise.resolve({
				model: "muse-voice-transcribe-1.0",
				ms: 5,
				seconds: (audio.byteLength - 44) / 32_000,
				text: "why is the sky blue",
			});
		},
	} as unknown as Transcription;

	const callerFor = (userId: string | null) =>
		appRouter.createCaller({
			art: {} as ImageEditing,
			db,
			isBeta: () => true,
			principal: userId ? { user: { id: userId } } : null,
			storage: {} as Storage,
			voice,
			waitUntil: () => undefined,
		} satisfies Context);

	beforeEach(async () => {
		db = (await freshDb()) as unknown as Database;
		requests = 0;
		fail = false;
	});

	test("returns the text and writes one successful cost row", async () => {
		const result = await callerFor("u1").voice.transcribe({
			audioBase64: wavBase64(2),
		});
		expect(result).toEqual({ text: "why is the sky blue" });
		const rows = await db.select().from(aiCalls);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			costMicroUsd: 100,
			model: "muse-voice-transcribe-1.0",
			ok: true,
			operation: "voice.transcribe",
			ownerId: "u1",
		});
	});

	test("a failed Meta call writes a failed cost row and surfaces an error", async () => {
		fail = true;
		const error = await callerFor("u1")
			.voice.transcribe({ audioBase64: wavBase64(1) })
			.catch((e) => e);
		expect(error.code).toBe("INTERNAL_SERVER_ERROR");
		const rows = await db.select().from(aiCalls);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			costMicroUsd: 0,
			error: expect.stringContaining("meta said no"),
			ok: false,
		});
	});

	test("audio over 30 s or a non-WAV is BAD_REQUEST before any request", async () => {
		const tooLong = await callerFor("u1")
			.voice.transcribe({ audioBase64: wavBase64(31) })
			.catch((e) => e);
		const notWav = await callerFor("u1")
			.voice.transcribe({
				audioBase64: Buffer.from("not audio, just some text").toString(
					"base64"
				),
			})
			.catch((e) => e);
		expect(tooLong.code).toBe("BAD_REQUEST");
		expect(notWav.code).toBe("BAD_REQUEST");
		expect(requests).toBe(0);
		expect(await db.select().from(aiCalls)).toHaveLength(0);
	});

	test("a visitor is UNAUTHORIZED and nothing is called", async () => {
		const error = await callerFor(null)
			.voice.transcribe({ audioBase64: wavBase64(1) })
			.catch((e) => e);
		expect(error.code).toBe("UNAUTHORIZED");
		expect(requests).toBe(0);
	});
});
