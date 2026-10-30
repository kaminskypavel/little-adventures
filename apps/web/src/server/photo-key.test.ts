// apps/web has no @types/bun, so the import has no types; the runner is bun.
// @ts-expect-error
import { expect, test } from "bun:test";

import { photoKey } from "./photo-key";

const EXTENSIONS: Record<string, string> = {
	"image/heic": "heic",
	"image/jpeg": "jpg",
	"image/png": "png",
};

test("each type gets its extension under the user's prefix", () => {
	for (const [type, extension] of Object.entries(EXTENSIONS)) {
		const key = photoKey("u1", type);
		expect(key.startsWith("little-adventures/users/u1/photos/")).toBe(true);
		expect(key.endsWith(`.${extension}`)).toBe(true);
	}
});

test("keys are unique per call", () => {
	expect(photoKey("u1", "image/png")).not.toBe(photoKey("u1", "image/png"));
});

test("other types are rejected", () => {
	expect(() => photoKey("u1", "text/html")).toThrow();
	expect(() => photoKey("u1", "constructor")).toThrow();
});
