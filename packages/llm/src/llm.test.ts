import { afterEach, beforeEach, expect, test } from "bun:test";
import { z } from "zod";

import { createLlm } from "./index";

const schema = z.object({
	title: z.string().describe("A short title"),
});

const llm = createLlm({ apiKey: "test-key", model: "muse-spark-test" });

const realFetch = globalThis.fetch;
let requests: { body: Record<string, unknown>; url: string }[] = [];
let reply: () => Response;

function completion(content: string): Response {
	return Response.json({
		choices: [{ message: { content } }],
		usage: {
			completion_tokens: 7,
			completion_tokens_details: { reasoning_tokens: 3 },
			prompt_tokens: 20,
			prompt_tokens_details: { cached_tokens: 5 },
		},
	});
}

beforeEach(() => {
	requests = [];
	reply = () => completion(JSON.stringify({ title: "Moon" }));
	globalThis.fetch = ((url: string, init: RequestInit) => {
		requests.push({ body: JSON.parse(init.body as string), url });
		return Promise.resolve(reply());
	}) as unknown as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = realFetch;
});

test("returns validated data with model, ms and usage", async () => {
	const result = await llm.generate({
		instructions: "You name things.",
		prompt: "Name it",
		safetyId: "user-1",
		schema,
	});
	expect(result.data).toEqual({ title: "Moon" });
	expect(result.model).toBe("muse-spark-test");
	expect(result.ms).toBeGreaterThanOrEqual(0);
	expect(result.usage).toEqual({
		cachedInputTokens: 5,
		inputTokens: 20,
		outputTokens: 7,
		reasoningTokens: 3,
	});
});

test("a call without instructions throws naming the README and sends nothing", async () => {
	const call = llm.generate({
		instructions: "",
		prompt: "Name it",
		safetyId: "user-1",
		schema,
	});
	await expect(call).rejects.toThrow("README > Prompts");
	expect(requests).toHaveLength(0);
});

test("the request carries the instructions, strict schema, model and safety id", async () => {
	await llm.generate({
		instructions: "You name things.",
		prompt: "Name it",
		reasoningEffort: "low",
		safetyId: "user-1",
		schema,
	});
	expect(requests).toHaveLength(1);
	const { body, url } = requests[0] as (typeof requests)[number];
	expect(url).toBe("https://api.meta.ai/v1/chat/completions");
	expect(body.model).toBe("muse-spark-test");
	expect(body.safety_identifier).toBe("user-1");
	expect(body.reasoning_effort).toBe("low");
	expect(body.messages).toEqual([
		{ content: "You name things.", role: "system" },
		{ content: "Name it", role: "user" },
	]);
	const format = body.response_format as {
		json_schema: { schema: Record<string, unknown>; strict: boolean };
		type: string;
	};
	expect(format.type).toBe("json_schema");
	expect(format.json_schema.strict).toBe(true);
	expect(format.json_schema.schema).toEqual(z.toJSONSchema(schema));
});

test("a non-2xx reply throws with the status", async () => {
	reply = () => new Response("nope", { status: 429 });
	const call = llm.generate({
		instructions: "You name things.",
		prompt: "Name it",
		safetyId: "user-1",
		schema,
	});
	await expect(call).rejects.toThrow("429");
	expect(requests).toHaveLength(1);
});

test("a reply that does not match the schema throws", async () => {
	reply = () => completion(JSON.stringify({ title: 42 }));
	const call = llm.generate({
		instructions: "You name things.",
		prompt: "Name it",
		safetyId: "user-1",
		schema,
	});
	await expect(call).rejects.toThrow();
});
