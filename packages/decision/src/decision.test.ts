/// <reference types="bun" />

import { afterEach, describe, expect, test } from "bun:test";

import { answerTokenMessages, createDecision, type QuestionSet } from "./index";
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

interface SentRequest {
	body: Record<string, unknown>;
	raw: string;
	url: string;
}

/** Records every request the package sends; `reply` builds the response for request number `index`. */
function captureRequests(
	reply: (sent: SentRequest, index: number) => Response
) {
	const requests: SentRequest[] = [];
	globalThis.fetch = ((url: string, init?: RequestInit) => {
		const raw = String(init?.body);
		const sent = { body: JSON.parse(raw), raw, url };
		requests.push(sent);
		return Promise.resolve(reply(sent, requests.length - 1));
	}) as unknown as typeof fetch;
	return requests;
}

/** A completion whose first generated token has these top log-probabilities. */
function answerTokenReply(text: string, topLogprobs: Record<string, number>) {
	const top = Object.entries(topLogprobs).map(([token, logprob]) => ({
		logprob,
		token,
	}));
	return Response.json({
		choices: [
			{
				logprobs: { content: [{ ...top[0], top_logprobs: top }] },
				message: { content: text },
			},
		],
		usage: { completion_tokens: 3, prompt_tokens: 20 },
	});
}

const kindSet: QuestionSet = {
	name: "kind-only",
	onUnreachable: "refuse",
	questions: { kind: { instructions: "Is it kind?" } },
};

const answerTokenDecision = (maxRetries = 0) =>
	createDecision({
		apiKey: "key",
		instructions: "Answer the questions.",
		maxRetries,
		model: "open-model",
		readout: "answer-token",
	});

const promptOnlyDecision = (maxRetries = 0) =>
	createDecision({
		apiKey: "key",
		instructions: "Answer the questions.",
		maxRetries,
		model: "open-model",
		responseFormat: "prompt-only-json",
	});

describe("answer-token readout", () => {
	test("P(yes) comes from the first token's probabilities and passes a pass-on-yes question", async () => {
		captureRequests(() =>
			answerTokenReply("yes", { Maybe: -5, no: -2.4, yes: -0.1 })
		);
		const result = await answerTokenDecision().decide({ story: "x" }, kindSet, {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(true);
		expect(result.answers).toEqual({
			kind: { pass: true, yes: expect.closeTo(0.909, 2) },
		});
	});

	test("the text after the answer word is the reason", async () => {
		captureRequests(() =>
			answerTokenReply("no. The outro skips a fact.", { no: -0.05, yes: -3 })
		);
		const result = await answerTokenDecision().decide({}, kindSet, {
			safetyId: "child-1",
		});
		expect(result.answers).toMatchObject({
			kind: { pass: false, reason: "The outro skips a fact." },
		});
	});

	test("no answer word among the first token's top choices makes the set not run", async () => {
		captureRequests(() => answerTokenReply("Well", { Maybe: -2, Well: -0.1 }));
		const result = await answerTokenDecision().decide({}, kindSet, {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(false);
		expect(result.answers).toEqual({});
		expect(result.attempts.map((attempt) => attempt.ran)).toEqual([false]);
	});

	test("one unusable question makes the whole set not run", async () => {
		captureRequests((sent) =>
			sent.raw.includes("Is it made up?")
				? answerTokenReply("Well", { Well: -0.1 })
				: answerTokenReply("yes", { no: -2.4, yes: -0.1 })
		);
		const result = await answerTokenDecision().decide({}, setWith("refuse"), {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(false);
		expect(result.attempts.map((attempt) => attempt.ran)).toEqual([false]);
	});

	test("one request per question, none with a response format", async () => {
		const sent = captureRequests(() =>
			answerTokenReply("yes", { no: -2.4, yes: -0.1 })
		);
		await answerTokenDecision().decide({ story: "x" }, setWith("refuse"), {
			safetyId: "child-1",
		});
		expect(sent).toHaveLength(2);
		for (const { body } of sent) {
			expect(body.response_format).toBeUndefined();
			expect(body.reasoning_effort).toBeUndefined();
			expect(body.logprobs).toBe(true);
			expect(body.top_logprobs).toBe(20);
			expect(body.temperature).toBe(0);
			expect(body.max_tokens).toBe(48);
			expect(body.safety_identifier).toBe("child-1");
		}
		const asked = sent.map(({ raw }) => raw.includes("Is it made up?"));
		expect(asked.sort()).toEqual([false, true]);
	});

	test("the exported prompt builder returns exactly the messages that are sent", async () => {
		const sent = captureRequests(() =>
			answerTokenReply("yes", { no: -2.4, yes: -0.1 })
		);
		const images = ["https://example.test/a.png", "https://example.test/b.png"];
		await createDecision({
			apiKey: "key",
			imagesNote: "Images are attached.",
			instructions: "Answer the questions.",
			model: "open-model",
			readout: "answer-token",
		}).decide({ story: "x" }, kindSet, { images, safetyId: "child-1" });
		expect(sent[0]?.body.messages).toEqual(
			JSON.parse(
				JSON.stringify(
					answerTokenMessages({
						images,
						imagesNote: "Images are attached.",
						instructions: "Answer the questions.",
						question: { instructions: "Is it kind?" },
						state: { story: "x" },
					})
				)
			)
		);
	});

	test("every attempt is listed with its time, usage and each answer's P(yes)", async () => {
		captureRequests((_sent, index) =>
			index === 0
				? answerTokenReply("Well", { Well: -0.1 })
				: answerTokenReply("yes", { no: -2.4, yes: -0.1 })
		);
		const result = await answerTokenDecision(1).decide({}, kindSet, {
			safetyId: "child-1",
		});
		expect(result.attempts.map((attempt) => attempt.ran)).toEqual([
			false,
			true,
		]);
		expect(result.attempts[0]?.yes).toBeUndefined();
		expect(result.attempts[1]?.yes?.kind).toBeCloseTo(0.909, 2);
		expect(result.attempts[1]?.model).toBe("open-model");
		expect(result.attempts[1]?.usage?.inputTokens).toBe(20);
		expect(result.attempts[0]?.usage?.inputTokens).toBe(20);
		expect(result.usage?.inputTokens).toBe(40);
	});

	test("an attempt that never gets an answer is still listed", async () => {
		globalThis.fetch = (() =>
			Promise.reject(new Error("timeout"))) as unknown as typeof fetch;
		const result = await answerTokenDecision(1).decide({}, kindSet, {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(false);
		expect(result.attempts).toHaveLength(2);
		expect(result.attempts[0]?.ran).toBe(false);
		expect(typeof result.attempts[0]?.ms).toBe("number");
		expect(result.attempts[0]?.usage).toBeUndefined();
	});
});

describe("prompt-only JSON", () => {
	const verdicts = { kind: verdict("yes", 0.9) };

	test("a reply wrapped in a code fence is parsed", async () => {
		const sent = captureRequests(() =>
			Response.json({
				choices: [
					{
						message: {
							content: `Here you go:\n\`\`\`json\n${JSON.stringify(verdicts)}\n\`\`\``,
						},
					},
				],
			})
		);
		const result = await promptOnlyDecision().decide({}, kindSet, {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(true);
		expect(result.answers).toEqual({
			kind: { pass: true, reason: "because", yes: 0.9 },
		});
		expect(sent[0]?.body.response_format).toBeUndefined();
		const messages = sent[0]?.body.messages as { content: string }[];
		expect(messages[1]?.content).toContain("Reply with the JSON object only");
	});

	test("prose with no JSON object does not run after the configured retries", async () => {
		const sent = captureRequests(() =>
			Response.json({
				choices: [{ message: { content: "I think it is kind." } }],
			})
		);
		const result = await promptOnlyDecision(2).decide({}, kindSet, {
			safetyId: "child-1",
		});
		expect(result.ran).toBe(false);
		expect(sent).toHaveLength(3);
		expect(result.attempts).toHaveLength(3);
	});
});

describe("default options", () => {
	test("send the same request as before readouts and response formats existed", async () => {
		const sent = captureRequests(() =>
			Response.json({
				choices: [
					{
						message: {
							content: JSON.stringify({
								kind: verdict("yes", 0.9),
								madeUp: verdict("no", 0.8),
							}),
						},
					},
				],
			})
		);
		await decision.decide({ story: "x" }, setWith("refuse"), {
			safetyId: "child-1",
		});
		const verdictSchema = {
			additionalProperties: false,
			properties: {
				answer: { enum: ["yes", "no"], type: "string" },
				confidence: { maximum: 1, minimum: 0, type: "number" },
				reason: { type: "string" },
			},
			required: ["answer", "confidence", "reason"],
			type: "object",
		};
		expect(sent).toHaveLength(1);
		expect(sent[0]?.url).toBe("https://api.meta.ai/v1/chat/completions");
		expect(sent[0]?.raw).toBe(
			JSON.stringify({
				max_completion_tokens: 4000,
				messages: [
					{ content: "Answer the questions.", role: "system" },
					{
						content:
							'State:\n```json\n{\n  "story": "x"\n}\n```\n\nQuestions (answer each one, keyed by its name):\n- kind: Is it kind?\n- madeUp: Is it made up?',
						role: "user",
					},
				],
				model: "muse-spark-1.3",
				reasoning_effort: "low",
				response_format: {
					json_schema: {
						name: "verdicts",
						schema: {
							additionalProperties: false,
							properties: { kind: verdictSchema, madeUp: verdictSchema },
							required: ["kind", "madeUp"],
							type: "object",
						},
						strict: true,
					},
					type: "json_schema",
				},
				safety_identifier: "child-1",
			})
		);
	});
});
