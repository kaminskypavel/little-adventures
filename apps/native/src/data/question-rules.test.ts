import { describe, expect, test } from "bun:test";
import { choiceLabel, lessonOf, mapLabel, openingOf } from "./question-rules";
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

describe("lessonOf", () => {
	const words = (text: string, from = 0) =>
		text.split(" ").map((w, i) => ({
			endSec: from + i + 0.8,
			startSec: from + i,
			text: w,
		}));
	const place = (extra: Partial<Place> = {}): Place => ({
		fact: "Bees drink sweet juice from flowers.",
		id: "p1",
		name: "Flower Juice",
		narration: [],
		parts: [],
		picture: null,
		question: "What do bees drink from flowers?",
		status: "ready",
		...extra,
	});

	test("cuts the narrator's own sentence for the fact out of a part's audio", () => {
		const said = words("Look! Bees drink sweet juice from flowers. Sip, sip.");
		const p = place({
			parts: [
				{ id: "a", status: "playable", url: "v1.mp4" },
				{
					id: "b",
					narration: { durationSec: 9, url: "n2.mp3", words: said },
					status: "playable",
					url: "v2.mp4",
				},
			],
		});
		const line = lessonOf(p);
		expect(line?.audio?.url).toBe("n2.mp3");
		expect(line?.audio?.fromSec).toBe(1);
		expect(line?.audio?.toSec).toBe(6.8);
		expect(line?.audio?.words.map((w) => w.text).join(" ")).toBe(
			"Bees drink sweet juice from flowers."
		);
		expect(line?.audio?.words[0].startSec).toBe(0);
	});

	test("takes the sentence that says the fact in other words", () => {
		const said = words(
			"We went to the market. Long ago people baked flat bread in very hot ovens."
		);
		const p = place({
			audio: { url: "n.mp3", words: said },
			fact: "People long ago baked flat bread in hot ovens.",
		});
		expect(
			lessonOf(p)
				?.audio?.words.map((w) => w.text)
				.join(" ")
		).toBe("Long ago people baked flat bread in very hot ovens.");
	});

	test("shows the fact without a voice when the narration never says it", () => {
		const p = place({
			audio: { url: "n.mp3", words: words("Bees love sun.") },
		});
		expect(lessonOf(p)).toEqual({
			audio: null,
			fact: "Bees drink sweet juice from flowers.",
		});
	});

	test("no lesson without a question and a fact", () => {
		expect(lessonOf(place({ question: null }))).toBe(null);
		expect(lessonOf(place({ fact: " " }))).toBe(null);
	});
});
