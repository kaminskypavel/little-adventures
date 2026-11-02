import { z } from "zod";

/**
 * Structured output from a Muse Spark chat model on Meta's Model API. Plain
 * `fetch`, one request per call, no retries (a retry is billed again).
 * The key, model and prompts are injected by the caller; this package reads no
 * env and holds no prompts of its own.
 *
 * Calls throw on any failure; the caller decides what that means.
 */

const DEFAULT_BASE_URL = "https://api.meta.ai/v1";
const REQUEST_TIMEOUT_MS = 100_000;

const completionSchema = z.object({
	choices: z
		.array(z.object({ message: z.object({ content: z.string().nullish() }) }))
		.min(1),
	usage: z
		.object({
			completion_tokens: z.number().default(0),
			completion_tokens_details: z
				.object({ reasoning_tokens: z.number().default(0) })
				.nullish(),
			prompt_tokens: z.number().default(0),
			prompt_tokens_details: z
				.object({ cached_tokens: z.number().default(0) })
				.nullish(),
		})
		.nullish(),
});

export interface LlmConfig {
	apiKey?: string;
	baseUrl?: string;
	model: string;
}

export interface LlmUsage {
	cachedInputTokens: number;
	inputTokens: number;
	outputTokens: number;
	reasoningTokens: number;
}

export interface LlmResult<T> {
	data: T;
	model: string;
	ms: number;
	usage: LlmUsage;
}

export interface GenerateInput<T extends z.ZodType> {
	instructions: string;
	prompt: string;
	reasoningEffort?: "high" | "low" | "medium" | "minimal";
	/** An opaque, stable id of the grown-up (never an email). */
	safetyId: string;
	schema: T;
}

export function createLlm(config: LlmConfig) {
	const { apiKey, baseUrl = DEFAULT_BASE_URL, model } = config;

	return {
		/**
		 * One request, one validated reply. Throws before any request when
		 * `instructions` is empty, on a non-2xx reply, and on a reply that does not
		 * match `schema`.
		 */
		async generate<T extends z.ZodType>(
			input: GenerateInput<T>
		): Promise<LlmResult<z.infer<T>>> {
			if (!input.instructions) {
				throw new Error(
					"The LLM package has no prompts of its own; see README > Prompts"
				);
			}
			if (!apiKey) {
				throw new Error("Meta Model API key is not set");
			}
			const startedAt = Date.now();
			const response = await fetch(`${baseUrl}/chat/completions`, {
				body: JSON.stringify({
					messages: [
						{ content: input.instructions, role: "system" },
						{ content: input.prompt, role: "user" },
					],
					model,
					reasoning_effort: input.reasoningEffort,
					response_format: {
						json_schema: {
							name: "reply",
							schema: z.toJSONSchema(input.schema),
							strict: true,
						},
						type: "json_schema",
					},
					safety_identifier: input.safetyId,
				}),
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				method: "POST",
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
			if (!response.ok) {
				throw new Error(`LLM ${response.status}: ${await response.text()}`);
			}
			const completion = completionSchema.parse(await response.json());
			const content = completion.choices[0]?.message.content;
			if (!content) {
				throw new Error("LLM returned no content");
			}
			const { usage } = completion;
			return {
				data: input.schema.parse(JSON.parse(content)),
				model,
				ms: Date.now() - startedAt,
				usage: {
					cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
					inputTokens: usage?.prompt_tokens ?? 0,
					outputTokens: usage?.completion_tokens ?? 0,
					reasoningTokens:
						usage?.completion_tokens_details?.reasoning_tokens ?? 0,
				},
			};
		},

		/** Whether a key is set. Tells a key-less env from a real failure. */
		isConfigured: Boolean(apiKey),
	};
}

export type Llm = ReturnType<typeof createLlm>;
