import { describe, expect, test } from "bun:test";
import {
	canRecord,
	hasAudio,
	heldLongEnough,
	trimQuestion,
} from "./voice-rules";
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

describe("heldLongEnough", () => {
	test("a press under half a second is ignored", () => {
		expect(heldLongEnough(200)).toBe(false);
		expect(heldLongEnough(500)).toBe(true);
	});
});

describe("trimQuestion", () => {
	test("a short question stays as it is", () => {
		expect(trimQuestion("  Why do whales sing? ")).toBe("Why do whales sing?");
	});
	test("a long one is cut at a word near 60 characters", () => {
		const out = trimQuestion(
			"Why do whales sing so loud when they swim around in the deep dark ocean at night"
		);
		expect(out.endsWith("...")).toBe(true);
		expect(out.length <= 63).toBe(true);
		expect(out).toBe(
			"Why do whales sing so loud when they swim around in the..."
		);
	});
});
