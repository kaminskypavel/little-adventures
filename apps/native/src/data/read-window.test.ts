import { describe, expect, test } from "bun:test";
import { readWindow } from "./read-window";

const text = "The rocket is big. It goes up! Does it fly? Yes, it flies.".split(
	" "
);

describe("readWindow", () => {
	test.each<[string, number, number, number]>([
		["first word", 0, 0, 4],
		["last word of a sentence", 3, 0, 4],
		["first word of the next sentence", 4, 4, 7],
		["inside a question", 8, 7, 10],
		["last word", 12, 10, 13],
		["current past the end is clamped", 99, 10, 13],
		["current before the start is clamped", -3, 0, 4],
	])("%s", (_name, current, start, end) => {
		expect(readWindow(text, current)).toEqual({ end, start });
	});

	test("no sentence marks: fixed chunks, not a sliding window", () => {
		const words = Array.from({ length: 10 }, (_, i) => `w${i}`);
		expect(readWindow(words, 0, 4)).toEqual({ end: 4, start: 0 });
		expect(readWindow(words, 3, 4)).toEqual({ end: 4, start: 0 });
		expect(readWindow(words, 4, 4)).toEqual({ end: 8, start: 4 });
		expect(readWindow(words, 9, 4)).toEqual({ end: 10, start: 8 });
	});

	test("a chunk never runs past its sentence", () => {
		const words = "a b c d e f. g h".split(" ");
		expect(readWindow(words, 4, 4)).toEqual({ end: 6, start: 4 });
	});

	test("a closing quote still ends the sentence", () => {
		expect(readWindow(['"Go."', "Then", "stop."], 1)).toEqual({
			end: 3,
			start: 1,
		});
	});

	test("empty words", () => {
		expect(readWindow([], 0)).toEqual({ end: 0, start: 0 });
	});
});
