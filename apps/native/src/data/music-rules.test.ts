import { describe, expect, test } from "bun:test";
import {
	BED_FULL,
	BED_LOW,
	bedVolume,
	FADE_MS,
	rampVolume,
	speakingAt,
} from "./music-rules";

const words = [
	{ endSec: 1, startSec: 0.4, text: "Once" },
	{ endSec: 2.5, startSec: 1.9, text: "upon" },
];

describe("the bed's volume", () => {
	test("low under the narration, fuller when no one speaks", () => {
		expect(bedVolume(true)).toBe(BED_LOW);
		expect(bedVolume(false)).toBe(BED_FULL);
	});

	test("a fade runs in a straight line and lands on the target", () => {
		expect(rampVolume(0.35, 0.12, 0)).toBe(0.35);
		expect(Math.round(rampVolume(0.35, 0.12, FADE_MS / 2) * 1000)).toBe(235);
		expect(rampVolume(0.35, 0.12, FADE_MS)).toBe(0.12);
		expect(rampVolume(0.35, 0.12, FADE_MS * 3)).toBe(0.12);
	});
});

describe("speakingAt", () => {
	test("from the first word to the last, pauses between included", () => {
		expect(speakingAt(words, 0.2, 3, false)).toBe(false);
		expect(speakingAt(words, 0.5, 3, false)).toBe(true);
		expect(speakingAt(words, 1.5, 3, false)).toBe(true);
		expect(speakingAt(words, 2.6, 3, false)).toBe(false);
	});

	test("not before the narration plays, and not once it has finished", () => {
		expect(speakingAt(words, 0, 3, false)).toBe(false);
		expect(speakingAt(words, 1, 3, true)).toBe(false);
	});

	test("words with no timings count until the end of the narration", () => {
		const flat = [{ endSec: 0, startSec: 0, text: "Once" }];
		expect(speakingAt(flat, 1, 3, false)).toBe(true);
		expect(speakingAt(flat, 3, 3, false)).toBe(false);
	});
});
