/// <reference types="bun" />

import { afterEach, describe, expect, test } from "bun:test";

import { createDecision, type QuestionSet } from "./index";
import { yesProbability } from "./probability";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

const verdict = (answer: string, confidence: number, reason = "because") => ({
	answer,
	confidence,
	reason,
});

function mockModelReply(verdicts: unknown) {
	globalThis.fetch = (() =>
		Promise.resolve(
			Response.json({
				choices: [{ message: { content: JSON.stringify(verdicts) } }],
				usage: { completion_tokens: 5, prompt_tokens: 20 },
			})
		)) as unknown as typeof fetch;
}

function mockServerDown() {
	globalThis.fetch = (() =>
		Promise.resolve(
			new Response("down", { status: 500 })
		)) as unknown as typeof fetch;
}

const setWith = (onUnreachable: "proceed" | "refuse"): QuestionSet => ({
	name: "test",
	onUnreachable,
	questions: {
		kind: { instructions: "Is it kind?" },
		madeUp: { instructions: "Is it made up?", passWhen: "no" },
	},
});

const decision = createDecision({
	apiKey: "key",
	instructions: "Answer the questions.",
	model: "muse-spark-1.3",
});

describe("decision", () => {
	test("every answer above the threshold passes", async () => {
		mockModelReply({ kind: verdict("yes", 0.9), madeUp: verdict("no", 0.8) });
		const set = setWith("refuse");
		const result = await decision.decide({ story: "x" }, set, {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(true);
		expect(result.usage?.inputTokens).toBe(20);
		expect(decision.passed(result, set)).toEqual({
			passed: true,
			reasons: [],
			unchecked: false,
		});
	});

	test("one confident no fails and returns that question's reason", async () => {
		mockModelReply({
			kind: verdict("no", 0.95, "it is unkind"),
			madeUp: verdict("no", 0.8),
		});
		const set = setWith("refuse");
		const result = await decision.decide({ story: "x" }, set, {
			safetyId: "child-1",
		});
		expect(decision.passed(result, set)).toEqual({
			passed: false,
			reasons: ["it is unkind"],
			unchecked: false,
		});
	});

	test("unreachable on a refuse set does not pass", async () => {
		mockServerDown();
		const set = setWith("refuse");
		const result = await decision.decide({}, set, { safetyId: "child-1" });
		expect(result.ran).toBe(false);
		expect(decision.passed(result, set).passed).toBe(false);
	});

	test("unreachable on a proceed set passes and is flagged unchecked", async () => {
		mockServerDown();
		const set = setWith("proceed");
		const result = await decision.decide({}, set, { safetyId: "child-1" });
		expect(decision.passed(result, set)).toEqual({
			passed: true,
			reasons: [],
			unchecked: true,
		});
	});

	test("building without instructions throws", () => {
		expect(() =>
			createDecision({
				apiKey: "key",
				instructions: "",
				model: "muse-spark-1.3",
			})
		).toThrow('README section "Prompts"');
	});
});

describe("yesProbability", () => {
	test("a confident yes is the confidence", () => {
		expect(yesProbability(verdict("yes", 0.9))).toBeCloseTo(0.9, 5);
	});

	test("a confident no is the complement", () => {
		expect(yesProbability(verdict("no", 0.9))).toBeCloseTo(0.1, 5);
	});

	test("out-of-range confidence is rejected", () => {
		expect(yesProbability(verdict("yes", 1.5))).toBeNull();
		expect(yesProbability(verdict("no", -0.1))).toBeNull();
	});

	test("malformed verdicts return null", () => {
		expect(yesProbability(verdict("maybe", 0.5))).toBeNull();
		expect(yesProbability({ answer: "yes" })).toBeNull();
		expect(yesProbability(null)).toBeNull();
	});
});
