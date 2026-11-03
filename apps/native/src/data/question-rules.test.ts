import { describe, expect, test } from "bun:test";
import {
	balanceLines,
	choiceLabel,
	mapLabel,
	openingOf,
} from "./question-rules";
import type { Adventure, Place } from "./types";

const lesson = {
	fact: "The sun shines light on the moon.",
	name: "Sun Light",
	question: "Where does moonlight come from?",
};

describe("mapLabel", () => {
	test("asks before the visit, answers after", () => {
		expect(mapLabel(lesson, false)).toEqual({
			kind: "question",
			text: lesson.question,
		});
		expect(mapLabel(lesson, true)).toEqual({
			kind: "answer",
			text: lesson.fact,
		});
	});
	test("no question keeps the name", () => {
		expect(mapLabel({ ...lesson, question: null }, true).kind).toBe("name");
		expect(mapLabel({ ...lesson, question: undefined }, false).text).toBe(
			"Sun Light"
		);
	});
	test("a visited place with no answer still asks", () => {
		expect(mapLabel({ ...lesson, fact: "" }, true).kind).toBe("question");
	});
});

describe("choiceLabel", () => {
	test("question, else name", () => {
		expect(choiceLabel(lesson)).toBe(lesson.question);
		expect(choiceLabel({ ...lesson, question: null })).toBe("Sun Light");
	});
});

describe("balanceLines", () => {
	test("a short question stays on one line", () => {
		expect(balanceLines("Where does the dark part go?".split(" "))).toEqual([
			0,
		]);
	});
	test("a long one breaks near the middle", () => {
		expect(balanceLines("Why does the moon change shape?".split(" "))).toEqual([
			0, 4,
		]);
	});
});

describe("openingOf", () => {
	const voice = { url: "https://files.test/q.mp3", words: [] };
	const place = (extra: Partial<Place> = {}): Place => ({
		fact: "",
		id: "p1",
		name: "",
		narration: [],
		parts: [],
		picture: null,
		status: "ready",
		...extra,
	});
	const adventure = (intro: Partial<Place>, p1: Partial<Place> = {}) =>
		({
			places: { intro: place(intro), outro: place(), p1: place(p1) },
			question: "How do you get to the moon?",
		}) as unknown as Adventure;

	test("the intro speaks its own question with its audio", () => {
		const a = adventure({
			question: "How do we get to the moon?",
			questionAudio: voice,
		});
		expect(openingOf(a, "intro")).toEqual({
			audio: voice,
			question: "How do we get to the moon?",
		});
	});
	test("an intro without one falls back to the adventure question, silent", () => {
		expect(openingOf(adventure({}), "intro")).toEqual({
			audio: null,
			question: "How do you get to the moon?",
		});
	});
	test("a place keeps its own question and audio; goodnight asks nothing", () => {
		const a = adventure({}, { question: "Why?", questionAudio: voice });
		expect(openingOf(a, "p1")).toEqual({ audio: voice, question: "Why?" });
		expect(openingOf(a, "outro").question).toBe(null);
		expect(openingOf(adventure({}), "p1").question).toBe(null);
	});
});
