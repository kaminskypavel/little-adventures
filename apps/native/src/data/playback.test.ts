import { describe, expect, test } from "bun:test";
import { endSource, wordIndexAt } from "./playback";

describe("endSource", () => {
	const cases = [
		{ clip: true, expected: "clip", narration: true },
		{ clip: true, expected: "clip", narration: false },
		{ clip: false, expected: "narration", narration: true },
		{ clip: false, expected: "timer", narration: false },
	] as const;

	for (const { clip, expected, narration } of cases) {
		test(`clip ${clip}, narration ${narration} ends on the ${expected}`, () => {
			expect(endSource({ hasClip: clip, hasNarration: narration })).toBe(
				expected
			);
		});
	}
});

describe("wordIndexAt", () => {
	const timed = [
		{ endSec: 0.4, startSec: 0, text: "Whales" },
		{ endSec: 0.9, startSec: 0.5, text: "sing" },
		{ endSec: 1.6, startSec: 1, text: "below" },
	];

	test("follows the word timings", () => {
		expect(wordIndexAt(timed, 0, 2)).toBe(0);
		expect(wordIndexAt(timed, 0.6, 2)).toBe(1);
		expect(wordIndexAt(timed, 1.7, 2)).toBe(2);
	});

	test("holds the last word spoken during a gap", () => {
		expect(wordIndexAt(timed, 0.45, 2)).toBe(0);
	});

	test("without timings the words are spread evenly over the narration", () => {
		const untimed = ["Whales", "sing", "below", "the", "sea"].map((text) => ({
			endSec: 0,
			startSec: 0,
			text,
		}));
		expect(wordIndexAt(untimed, 0, 10)).toBe(0);
		expect(wordIndexAt(untimed, 4.5, 10)).toBe(2);
		expect(wordIndexAt(untimed, 10, 10)).toBe(4);
	});

	test("before the narration's length is known the first word stays", () => {
		expect(wordIndexAt([{ endSec: 0, startSec: 0, text: "Hi" }], 1, 0)).toBe(0);
	});
});
