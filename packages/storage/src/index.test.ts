import { describe, expect, test } from "bun:test";

import { createStorage, NOT_CONFIGURED } from "./index";

// Fake but well-formed credentials: presigning is local, so these never touch R2.
const FAKE = {
	R2_ACCESS_KEY_ID: "test-key-id",
	R2_ACCOUNT_ID: "acct123",
	R2_BUCKET: "media",
	R2_SECRET_ACCESS_KEY: "test-secret",
};

describe("storage without credentials", () => {
	const storage = createStorage({});

	test("reports itself unconfigured", () => {
		expect(storage.isConfigured).toBe(false);
	});

	test("copyFrom throws before downloading anything", async () => {
		await expect(
			storage.copyFrom("https://example.invalid/file.bin", "a/b.bin")
		).rejects.toThrow(NOT_CONFIGURED);
	});

	test("readUrl and uploadUrlFor throw instead of returning a broken url", async () => {
		await expect(storage.readUrl("a/b.bin")).rejects.toThrow(NOT_CONFIGURED);
		await expect(
			storage.uploadUrlFor({
				contentLength: 3,
				contentType: "image/jpeg",
				key: "a/b.jpg",
			})
		).rejects.toThrow(NOT_CONFIGURED);
	});
});

test("a partial R2 config fails at creation and names what is missing", () => {
	expect(() => createStorage({ R2_BUCKET: "media" })).toThrow(
		"R2_ACCESS_KEY_ID"
	);
});

describe("presigned urls", () => {
	const storage = createStorage(FAKE);

	test("upload url signs content-type and targets the S3 endpoint", async () => {
		const { key, uploadUrl } = await storage.uploadUrlFor({
			contentLength: 3,
			contentType: "image/jpeg",
			key: "uploads/u1/photo.jpg",
		});
		const url = new URL(uploadUrl);
		expect(key).toBe("uploads/u1/photo.jpg");
		expect(url.host).toBe("media.acct123.r2.cloudflarestorage.com");
		expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain(
			"content-type"
		);
	});

	test("upload over the size ceiling is refused", async () => {
		await expect(
			storage.uploadUrlFor({
				contentLength: 11,
				contentType: "image/jpeg",
				key: "k.jpg",
				maxBytes: 10,
			})
		).rejects.toThrow("exceeds");
	});

	test("private bucket reads are presigned, public bucket reads are plain", async () => {
		const privateUrl = new URL(await storage.readUrl("files/f1/object.bin"));
		expect(privateUrl.searchParams.has("X-Amz-Signature")).toBe(true);

		const publicStorage = createStorage({
			...FAKE,
			R2_PUBLIC_URL: "https://media.example.com/",
		});
		expect(await publicStorage.readUrl("files/f1/object.bin")).toBe(
			"https://media.example.com/files/f1/object.bin"
		);
	});
});
