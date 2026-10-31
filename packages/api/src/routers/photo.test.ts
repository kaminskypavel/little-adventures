import { describe, expect, test } from "bun:test";

import type { Database } from "@little-adventures/db";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";
import type { Transcription } from "@little-adventures/transcribe";
import { TRPCError } from "@trpc/server";

import type { Context } from "../context";
import { appRouter } from "./index";

const calls: string[] = [];

// No network: a storage that only records what it was asked for.
const storage = {
	readUrl: (key: string) => {
		calls.push(`read ${key}`);
		return Promise.resolve(`https://files.test/${key}`);
	},
	uploadUrlFor: (input: { key: string }) =>
		Promise.resolve({ key: input.key, uploadUrl: "https://files.test/put" }),
} as unknown as Storage;

const callerFor = (userId: string | null) =>
	appRouter.createCaller({
		art: {} as ImageEditing,
		db: {} as Database,
		principal: userId ? { user: { id: userId } } : null,
		storage,
		voice: {} as Transcription,
		waitUntil: () => undefined,
	} satisfies Context);

describe("protectedProcedure", () => {
	test("rejects a visitor with UNAUTHORIZED", async () => {
		const visitor = callerFor(null);
		const errors = await Promise.all(
			[
				() => visitor.child.mine(),
				() =>
					visitor.photo.readUrl({ key: "little-adventures/users/u1/x.jpg" }),
				() => visitor.photo.uploadUrl({ contentType: "image/jpeg", size: 10 }),
			].map((call) => call().catch((e) => e))
		);
		for (const error of errors) {
			expect(error).toBeInstanceOf(TRPCError);
			expect(error.code).toBe("UNAUTHORIZED");
		}
	});

	test("healthCheck stays public", async () => {
		expect(await callerFor(null).healthCheck()).toBe("OK");
	});
});

describe("photo.readUrl", () => {
	test("gives a url for a key under the caller's own prefix", async () => {
		const key = "little-adventures/users/u1/photos/a.jpg";
		expect(await callerFor("u1").photo.readUrl({ key })).toEqual({
			url: `https://files.test/${key}`,
		});
	});

	test("refuses another user's key, a sibling prefix and a `..` hop", async () => {
		calls.length = 0;
		const errors = await Promise.all(
			[
				"little-adventures/users/u2/photos/a.jpg",
				"little-adventures/users/u10/photos/a.jpg",
				"little-adventures/users/u1/../u2/photos/a.jpg",
				"somewhere/else.jpg",
			].map((key) =>
				callerFor("u1")
					.photo.readUrl({ key })
					.catch((e) => e)
			)
		);
		for (const error of errors) {
			expect(error).toBeInstanceOf(TRPCError);
			expect(error.code).toBe("FORBIDDEN");
		}
		expect(calls).toEqual([]);
	});
});

describe("photo.uploadUrl", () => {
	test("picks a key under the caller's prefix", async () => {
		const { key, uploadUrl } = await callerFor("u1").photo.uploadUrl({
			contentType: "image/png",
			size: 1000,
		});
		expect(key.startsWith("little-adventures/users/u1/photos/")).toBe(true);
		expect(key.endsWith(".png")).toBe(true);
		expect(uploadUrl).toBe("https://files.test/put");
	});

	test("refuses a photo over the size limit", async () => {
		const error = await callerFor("u1")
			.photo.uploadUrl({ contentType: "image/jpeg", size: 11 * 1024 * 1024 })
			.catch((e) => e);
		expect(error.code).toBe("PAYLOAD_TOO_LARGE");
	});
});
