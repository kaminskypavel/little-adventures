/**
 * The decision API: yes/no questions about a JSON state (and optional images),
 * answered as P(yes) with a one-sentence reason, never prose.
 *
 * By default one chat completion answers the whole question set, constrained
 * to a strict JSON schema with one `{ answer, confidence, reason }` verdict
 * per question name, and P(yes) is the stated confidence. Two options change
 * that: `responseFormat: "prompt-only-json"` asks for the same JSON in the
 * prompt, for servers with no structured output, and `readout: "answer-token"`
 * asks each question in its own completion and reads P(yes) from the
 * probabilities of the first generated token (see `answerTokenMessages`).
 *
 * `decide` never rejects: a missing key, a failing server, a timeout or an
 * unusable answer all fold into `ran: false`, so a caller only branches on the
 * set's `onUnreachable` policy (see `passed`).
 *
 * The package reads no env and holds no prompts or question sets: the caller
 * injects the base URL, the key, the instructions, the question sets and the model.
 */
import {
	extractJsonObject,
	firstTokenYes,
	parseVerdict,
	reasonAfterAnswer,
	type TokenLogprob,
	yesOf,
} from "./probability";

const DEFAULT_BASE_URL = "https://api.meta.ai/v1";
/** How sure the model must be before an answer counts as a yes. 0.5 is the neutral midpoint. */
const DEFAULT_PASS_AT = 0.5;
/** How long ONE attempt waits before it reads as failed. */
const DEFAULT_TIMEOUT_MS = 60_000;
/** How many more attempts the call gets after the first one fails. */
const DEFAULT_MAX_RETRIES = 1;
/** Reasoning tokens count against this, so leave headroom over the verdict JSON itself. */
const MAX_COMPLETION_TOKENS = 4000;
/** Answer-token mode needs the answer word plus room for a one-sentence reason. */
const ANSWER_TOKEN_MAX_TOKENS = 48;
/** How many candidates for the first generated token the server lists. */
const ANSWER_TOKEN_TOP_LOGPROBS = 20;
/** Appended to the question text when the server cannot enforce the JSON schema. */
const JSON_ONLY_NOTE =
	'Reply with the JSON object only, no other text: one key per question name, each holding {"answer": "yes" or "no", "confidence": a number from 0 to 1, "reason": "one sentence"}.';

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

/** How P(yes) is read: from the confidence the model states, or from the probability of the answer word itself. */
export type DecisionReadout = "answer-token" | "stated";

/** How the reply is shaped: forced by a strict JSON schema, or asked for in the prompt and parsed leniently. */
export type DecisionResponseFormat = "prompt-only-json" | "strict-schema";

/** One round of requests to the model: what it cost and what it said, for the caller to record. */
export interface DecisionAttempt {
	model: string;
	/** How long this attempt took, failed or not. */
	ms: number;
	/** True when the attempt gave a usable answer for every question. */
	ran: boolean;
	/** Tokens billed by this attempt. Absent when nothing reached the model. */
	usage?: DecisionUsage;
	/** P(yes) per question name. Only on a usable attempt. */
	yes?: Record<string, number>;
}

/** `ran: false` is the one result for missing key, unreachable server, timeout and unusable answers alike. */
export interface DecisionResult {
	answers: Record<string, DecisionAnswer>;
	/** Every attempt in order, the failed ones included. Empty when nothing was sent. */
	attempts: DecisionAttempt[];
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
	/**
	 * Where P(yes) comes from. "stated" (default): the confidence in the model's
	 * JSON verdict. "answer-token": one completion per question, read from the
	 * probabilities of the first generated token; `responseFormat` is then not used.
	 */
	readout?: DecisionReadout;
	/**
	 * How a "stated" readout is requested. "strict-schema" (default): a strict
	 * JSON schema. "prompt-only-json": the prompt asks for the JSON and the reply
	 * is parsed leniently, for servers with no structured output.
	 */
	responseFormat?: DecisionResponseFormat;
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
	choices?: {
		logprobs?: {
			content?: { top_logprobs?: TokenLogprob[] | null }[] | null;
		} | null;
		message?: { content?: string | null };
	}[];
	usage?: {
		completion_tokens?: number;
		completion_tokens_details?: { reasoning_tokens?: number } | null;
		prompt_tokens?: number;
		prompt_tokens_details?: { cached_tokens?: number } | null;
	} | null;
}

type MessageContent =
	| string
	| (
			| { text: string; type: "text" }
			| { image_url: { url: string }; type: "image_url" }
	  )[];

export interface ChatMessage {
	content: MessageContent;
	role: "system" | "user";
}

const stateBlock = (state: unknown): string =>
	`State:\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\``;

function userPrompt(
	state: unknown,
	questions: Record<string, DecisionQuestion>
): string {
	const lines = Object.entries(questions).map(
		([name, q]) => `- ${name}: ${q.instructions}`
	);
	return `${stateBlock(state)}\n\nQuestions (answer each one, keyed by its name):\n${lines.join("\n")}`;
}

/** The instructions, plus the images note when images are attached. */
const systemText = (
	instructions: string,
	imagesNote: string | undefined,
	images: readonly string[]
): string =>
	images.length === 0 || !imagesNote
		? instructions
		: `${instructions} ${imagesNote}`;

/** The text part comes first, then the images in order. */
const userContent = (
	text: string,
	images: readonly string[]
): MessageContent =>
	images.length === 0
		? text
		: [
				{ text, type: "text" },
				...images.map((url) => ({
					image_url: { url },
					type: "image_url" as const,
				})),
			];

export interface AnswerTokenPromptInput {
	/** Image urls the question is about, in order; the state says what each one is. */
	images?: readonly string[];
	/** Appended to the instructions when images are attached. */
	imagesNote?: string;
	instructions: string;
	question: DecisionQuestion;
	state: unknown;
}

/**
 * The system and user messages for ONE question in answer-token mode. `decide`
 * sends exactly these, so training data built with this function matches what
 * is served.
 */
export function answerTokenMessages(
	input: AnswerTokenPromptInput
): ChatMessage[] {
	const images = input.images ?? [];
	const text = `${stateBlock(input.state)}\n\nQuestion:\n${input.question.instructions}`;
	return [
		{
			content: systemText(input.instructions, input.imagesNote, images),
			role: "system",
		},
		{ content: userContent(text, images), role: "user" },
	];
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

const emptyUsage = (): DecisionUsage => ({
	cachedInputTokens: 0,
	inputTokens: 0,
	outputTokens: 0,
	reasoningTokens: 0,
});

/** The usage when anything was billed, else undefined. */
const billedUsage = (usage: DecisionUsage): DecisionUsage | undefined =>
	usage.inputTokens + usage.outputTokens > 0 ? usage : undefined;

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

/** Tokens billed across every attempt, failed ones included. */
function totalUsage(attempts: DecisionAttempt[]): DecisionUsage | undefined {
	const total = emptyUsage();
	for (const { usage } of attempts) {
		if (usage) {
			total.cachedInputTokens += usage.cachedInputTokens;
			total.inputTokens += usage.inputTokens;
			total.outputTokens += usage.outputTokens;
			total.reasoningTokens += usage.reasoningTokens;
		}
	}
	return billedUsage(total);
}

/** One attempt's outcome: the answers by question name, or null when unusable. */
interface AttemptRun {
	answers: Record<string, DecisionAnswer> | null;
	attempt: DecisionAttempt;
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
	const readout = options.readout ?? "stated";
	const responseFormat = options.responseFormat ?? "strict-schema";

	const unreachable = (set: QuestionSet): DecisionResult => ({
		answers: {},
		attempts: [],
		model: options.model,
		onUnreachable: set.onUnreachable,
		ran: false,
	});

	const passes = (question: DecisionQuestion, yes: number): boolean =>
		question.passWhen === "no" ? yes < passAt : yes >= passAt;

	/** Posts one chat completion and counts its billed tokens. Null when the server answers with an error status. */
	async function complete(
		payload: Record<string, unknown>,
		spent: DecisionUsage
	): Promise<CompletionBody | null> {
		const response = await fetch(`${baseUrl}/chat/completions`, {
			body: JSON.stringify(payload),
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
		return body;
	}

	/** Stated readout: one completion for the whole set, a verdict per question name. Null when unusable. */
	async function askStated(
		state: unknown,
		set: QuestionSet,
		spent: DecisionUsage,
		images: readonly string[],
		safetyId: string
	): Promise<Record<string, DecisionAnswer> | null> {
		const promptOnly = responseFormat === "prompt-only-json";
		const questionsText = userPrompt(state, set.questions);
		const text = promptOnly
			? `${questionsText}\n\n${JSON_ONLY_NOTE}`
			: questionsText;
		const body = await complete(
			{
				max_completion_tokens: MAX_COMPLETION_TOKENS,
				messages: [
					{
						content: systemText(
							options.instructions,
							options.imagesNote,
							images
						),
						role: "system",
					},
					{ content: userContent(text, images), role: "user" },
				],
				model: options.model,
				// The model rejects reasoning "none"; "low" keeps the call quick.
				reasoning_effort: "low",
				...(promptOnly
					? {}
					: {
							response_format: {
								json_schema: {
									name: "verdicts",
									schema: verdictsSchema(Object.keys(set.questions)),
									strict: true,
								},
								type: "json_schema",
							},
						}),
				safety_identifier: safetyId,
			},
			spent
		);
		const content = body?.choices?.[0]?.message?.content;
		if (!content) {
			return null;
		}
		const verdicts: unknown = promptOnly
			? extractJsonObject(content)
			: JSON.parse(content);
		if (typeof verdicts !== "object" || verdicts === null) {
			return null;
		}

		const answers: Record<string, DecisionAnswer> = {};
		for (const [name, question] of Object.entries(set.questions)) {
			const verdict = parseVerdict((verdicts as Record<string, unknown>)[name]);
			if (!verdict) {
				return null;
			}
			const yes = yesOf(verdict);
			answers[name] = {
				pass: passes(question, yes),
				reason: verdict.reason,
				yes,
			};
		}
		return answers;
	}

	/** Answer-token readout for ONE question. Null when the first token is neither answer word or the request fails. */
	async function askQuestion(
		state: unknown,
		question: DecisionQuestion,
		spent: DecisionUsage,
		images: readonly string[],
		safetyId: string
	): Promise<DecisionAnswer | null> {
		try {
			const body = await complete(
				{
					logprobs: true,
					max_tokens: ANSWER_TOKEN_MAX_TOKENS,
					messages: answerTokenMessages({
						images,
						imagesNote: options.imagesNote,
						instructions: options.instructions,
						question,
						state,
					}),
					model: options.model,
					safety_identifier: safetyId,
					temperature: 0,
					top_logprobs: ANSWER_TOKEN_TOP_LOGPROBS,
				},
				spent
			);
			const choice = body?.choices?.[0];
			const yes = firstTokenYes(choice?.logprobs?.content?.[0]?.top_logprobs);
			if (yes === null) {
				return null;
			}
			return {
				pass: passes(question, yes),
				reason: reasonAfterAnswer(choice?.message?.content),
				yes,
			};
		} catch {
			// timeout or dropped connection: this question is unusable, and so is the set.
			return null;
		}
	}

	/** Answer-token readout: every question in its own completion, in parallel; all must be usable. */
	async function askAnswerTokens(
		state: unknown,
		set: QuestionSet,
		spent: DecisionUsage,
		images: readonly string[],
		safetyId: string
	): Promise<Record<string, DecisionAnswer> | null> {
		const asked = await Promise.all(
			Object.entries(set.questions).map(async ([name, question]) => ({
				answer: await askQuestion(state, question, spent, images, safetyId),
				name,
			}))
		);
		const answers: Record<string, DecisionAnswer> = {};
		for (const { answer, name } of asked) {
			if (!answer) {
				return null;
			}
			answers[name] = answer;
		}
		return answers;
	}

	/** One attempt. Never throws: a timeout, dropped connection or bad JSON is an unusable attempt. */
	async function attemptOnce(
		state: unknown,
		set: QuestionSet,
		images: readonly string[],
		safetyId: string
	): Promise<AttemptRun> {
		const startedAt = Date.now();
		const spent = emptyUsage();
		let answers: Record<string, DecisionAnswer> | null = null;
		try {
			const ask = readout === "answer-token" ? askAnswerTokens : askStated;
			answers = await ask(state, set, spent, images, safetyId);
		} catch {
			// leave the answers null
		}
		return {
			answers,
			attempt: {
				model: options.model,
				ms: Date.now() - startedAt,
				ran: answers !== null,
				usage: billedUsage(spent),
				yes: answers
					? Object.fromEntries(
							Object.entries(answers).map(([name, { yes }]) => [name, yes])
						)
					: undefined,
			},
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
		const attempts: DecisionAttempt[] = [];
		for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
			// biome-ignore lint/performance/noAwaitInLoops: sequential retries, each only fires after the one before it failed.
			const run = await attemptOnce(
				state,
				set,
				call.images ?? [],
				call.safetyId
			);
			attempts.push(run.attempt);
			if (run.answers) {
				// ms and usage cover every attempt, not just the winning one.
				return {
					answers: run.answers,
					attempts,
					model: options.model,
					ms: Date.now() - startedAt,
					onUnreachable: set.onUnreachable,
					ran: true,
					usage: totalUsage(attempts),
				};
			}
		}
		return { ...unreachable(set), attempts, usage: totalUsage(attempts) };
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
