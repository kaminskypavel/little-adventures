/**
 * The decision API: yes/no questions about a JSON state (and optional images),
 * answered as P(yes) with a one-sentence reason, never prose.
 *
 * One chat completion per question set (all questions together), constrained
 * to a strict JSON schema with one `{ answer, confidence, reason }` verdict
 * per question name. `decide` never rejects: a missing key, a failing server,
 * a timeout or an unusable answer all fold into `ran: false`, so a caller only
 * branches on the set's `onUnreachable` policy (see `passed`).
 *
 * The package reads no env and holds no prompts or question sets: the caller
 * injects the key, the instructions, the question sets and the model.
 */
import { parseVerdict, yesProbability } from "./probability";

const DEFAULT_BASE_URL = "https://api.meta.ai/v1";
/** How sure the model must be before an answer counts as a yes. 0.5 is the neutral midpoint. */
const DEFAULT_PASS_AT = 0.5;
/** How long ONE attempt waits before it reads as failed. */
const DEFAULT_TIMEOUT_MS = 60_000;
/** How many more attempts the call gets after the first one fails. */
const DEFAULT_MAX_RETRIES = 1;
/** Reasoning tokens count against this, so leave headroom over the verdict JSON itself. */
const MAX_COMPLETION_TOKENS = 4000;

export interface DecisionQuestion {
	instructions: string;
	/** Which answer counts as a pass. Default "yes"; a risk question ("is this made up") passes on "no". */
	passWhen?: "no" | "yes";
}

/** A named set of questions asked together, and what an unreachable model means for THIS set. */
export interface QuestionSet {
	name: string;
	onUnreachable: "proceed" | "refuse";
	questions: Record<string, DecisionQuestion>;
}

export interface DecisionAnswer {
	pass: boolean;
	/** The model's one-sentence reason, when it gave one. */
	reason?: string;
	/** P(yes), 0 to 1. */
	yes: number;
}

export interface DecisionUsage {
	cachedInputTokens: number;
	inputTokens: number;
	outputTokens: number;
	reasoningTokens: number;
}

/** `ran: false` is the one result for missing key, unreachable server, timeout and unusable answers alike. */
export interface DecisionResult {
	answers: Record<string, DecisionAnswer>;
	model: string;
	ms?: number;
	onUnreachable: "proceed" | "refuse";
	ran: boolean;
	/** Tokens billed across every attempt, failed ones included. Absent when nothing reached the model. */
	usage?: DecisionUsage;
}

export interface DecisionOptions {
	apiKey: string;
	/** Defaults to the Meta Model API. */
	baseUrl?: string;
	/** Appended to the instructions when images are attached. */
	imagesNote?: string;
	instructions: string;
	maxRetries?: number;
	model: string;
	passAt?: number;
	timeoutMs?: number;
}

export interface PassOutcome {
	passed: boolean;
	/** The model's reason for each failed question. */
	reasons: string[];
	/** True when the model never ran and the set's policy let the content through anyway. */
	unchecked: boolean;
}

interface CompletionBody {
	choices?: { message?: { content?: string | null } }[];
	usage?: {
		completion_tokens?: number;
		completion_tokens_details?: { reasoning_tokens?: number } | null;
		prompt_tokens?: number;
		prompt_tokens_details?: { cached_tokens?: number } | null;
	} | null;
}

function userPrompt(
	state: unknown,
	questions: Record<string, DecisionQuestion>
): string {
	const lines = Object.entries(questions).map(
		([name, q]) => `- ${name}: ${q.instructions}`
	);
	return `State:\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\nQuestions (answer each one, keyed by its name):\n${lines.join("\n")}`;
}

/** Strict JSON schema: an object with one required verdict per question name. */
function verdictsSchema(names: string[]) {
	const verdict = {
		additionalProperties: false,
		properties: {
			answer: { enum: ["yes", "no"], type: "string" },
			confidence: { maximum: 1, minimum: 0, type: "number" },
			reason: { type: "string" },
		},
		required: ["answer", "confidence", "reason"],
		type: "object",
	};
	return {
		additionalProperties: false,
		properties: Object.fromEntries(names.map((name) => [name, verdict])),
		required: names,
		type: "object",
	};
}

/** Adds one response's billed tokens to the running total. */
function addUsage(total: DecisionUsage, usage: CompletionBody["usage"]): void {
	if (!usage) {
		return;
	}
	total.inputTokens += usage.prompt_tokens ?? 0;
	total.cachedInputTokens += usage.prompt_tokens_details?.cached_tokens ?? 0;
	total.outputTokens += usage.completion_tokens ?? 0;
	total.reasoningTokens +=
		usage.completion_tokens_details?.reasoning_tokens ?? 0;
}

export function createDecision(options: DecisionOptions) {
	if (!options.instructions) {
		throw new Error(
			'createDecision needs instructions: the package ships none. See the README section "Prompts".'
		);
	}
	const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
	const passAt = options.passAt ?? DEFAULT_PASS_AT;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

	const unreachable = (set: QuestionSet): DecisionResult => ({
		answers: {},
		model: options.model,
		onUnreachable: set.onUnreachable,
		ran: false,
	});

	const passes = (question: DecisionQuestion, yes: number): boolean =>
		question.passWhen === "no" ? yes < passAt : yes >= passAt;

	/** One attempt: the verdicts keyed by question name, or null when the answer is unusable. */
	async function askOnce(
		state: unknown,
		set: QuestionSet,
		spent: DecisionUsage,
		images: readonly string[],
		safetyId: string
	): Promise<DecisionResult | null> {
		const startedAt = Date.now();
		const text = userPrompt(state, set.questions);
		// The text part comes first, then the images in order.
		const userContent =
			images.length === 0
				? text
				: [
						{ text, type: "text" },
						...images.map((url) => ({ image_url: { url }, type: "image_url" })),
					];
		const system =
			images.length === 0 || !options.imagesNote
				? options.instructions
				: `${options.instructions} ${options.imagesNote}`;
		const response = await fetch(`${baseUrl}/chat/completions`, {
			body: JSON.stringify({
				max_completion_tokens: MAX_COMPLETION_TOKENS,
				messages: [
					{ content: system, role: "system" },
					{ content: userContent, role: "user" },
				],
				model: options.model,
				// The model rejects reasoning "none"; "low" keeps the call quick.
				reasoning_effort: "low",
				response_format: {
					json_schema: {
						name: "verdicts",
						schema: verdictsSchema(Object.keys(set.questions)),
						strict: true,
					},
					type: "json_schema",
				},
				safety_identifier: safetyId,
			}),
			headers: {
				Authorization: `Bearer ${options.apiKey}`,
				"Content-Type": "application/json",
			},
			method: "POST",
			signal: AbortSignal.timeout(timeoutMs),
		});
		if (!response.ok) {
			return null;
		}
		const body = (await response.json()) as CompletionBody;
		addUsage(spent, body.usage);
		const content = body.choices?.[0]?.message?.content;
		if (!content) {
			return null;
		}
		const verdicts: unknown = JSON.parse(content);
		if (typeof verdicts !== "object" || verdicts === null) {
			return null;
		}

		const answers: Record<string, DecisionAnswer> = {};
		for (const [name, question] of Object.entries(set.questions)) {
			const raw = (verdicts as Record<string, unknown>)[name];
			const yes = yesProbability(raw);
			if (yes === null) {
				return null;
			}
			answers[name] = {
				pass: passes(question, yes),
				reason: parseVerdict(raw)?.reason,
				yes,
			};
		}
		return {
			answers,
			model: options.model,
			ms: Date.now() - startedAt,
			onUnreachable: set.onUnreachable,
			ran: true,
		};
	}

	async function decide(
		state: unknown,
		set: QuestionSet,
		call: {
			/** Image urls the questions are about, in order; the state says what each one is. */
			images?: readonly string[];
			/** An opaque, stable id of the grown-up (never an email). */
			safetyId: string;
		}
	): Promise<DecisionResult> {
		if (!options.apiKey || Object.keys(set.questions).length === 0) {
			return unreachable(set);
		}

		const startedAt = Date.now();
		const spent: DecisionUsage = {
			cachedInputTokens: 0,
			inputTokens: 0,
			outputTokens: 0,
			reasoningTokens: 0,
		};
		const billed = () =>
			spent.inputTokens + spent.outputTokens > 0 ? spent : undefined;
		for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
			try {
				// biome-ignore lint/performance/noAwaitInLoops: sequential retries, each only fires after the one before it failed.
				const result = await askOnce(
					state,
					set,
					spent,
					call.images ?? [],
					call.safetyId
				);
				if (result) {
					// ms and usage cover every attempt, not just the winning one.
					return { ...result, ms: Date.now() - startedAt, usage: billed() };
				}
			} catch {
				// timeout, dropped connection or bad JSON: retry, then give up as unreachable.
			}
		}
		return { ...unreachable(set), usage: billed() };
	}

	/** Applies the pass threshold (already in each answer) and the set's `onUnreachable` policy. */
	function passed(result: DecisionResult, set: QuestionSet): PassOutcome {
		if (!result.ran) {
			return {
				passed: set.onUnreachable === "proceed",
				reasons: [],
				unchecked: set.onUnreachable === "proceed",
			};
		}
		const failing = Object.values(result.answers).filter((a) => !a.pass);
		return {
			passed: failing.length === 0,
			reasons: failing.flatMap((a) => (a.reason ? [a.reason] : [])),
			unchecked: false,
		};
	}

	return { decide, passed };
}
