import { describe, expect, test } from "bun:test";
import { choiceLabel, mapLabel } from "./question-rules";

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
