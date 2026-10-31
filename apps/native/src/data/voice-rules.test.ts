import { describe, expect, test } from "bun:test";
import { canRecord, hasAudio } from "./voice-rules";
import { encodeWav } from "./wav";

describe("canRecord", () => {
	test("only a granted microphone starts a recording", () => {
		expect(canRecord("granted")).toBe(true);
		expect(canRecord("denied")).toBe(false);
		expect(canRecord("undetermined")).toBe(false);
	});
});

describe("hasAudio", () => {
	test("an empty recording has none, a spoken one does", () => {
		expect(hasAudio(encodeWav(new Float32Array(0), 16_000))).toBe(false);
		expect(hasAudio(encodeWav(new Float32Array(160), 16_000))).toBe(true);
	});
});
