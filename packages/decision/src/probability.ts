/** One question's verdict as the model returns it. */
export interface Verdict {
	answer: "no" | "yes";
	confidence: number;
	reason: string;
}

/** The verdict when `raw` is well formed, else null. A confidence outside 0..1 is rejected, not clamped. */
export function parseVerdict(raw: unknown): Verdict | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	const { answer, confidence, reason } = raw as Record<string, unknown>;
	if (
		(answer !== "yes" && answer !== "no") ||
		typeof confidence !== "number" ||
		!(confidence >= 0 && confidence <= 1) ||
		typeof reason !== "string"
	) {
		return null;
	}
	return { answer, confidence, reason };
}

/** P("yes") from a parsed verdict: the confidence for a yes, the complement for a no. */
export const yesOf = (verdict: Verdict): number =>
	verdict.answer === "yes" ? verdict.confidence : 1 - verdict.confidence;

/**
 * P("yes") from one verdict: the confidence when the answer is yes, the
 * complement when it is no. Null for anything malformed or out of range.
 */
export function yesProbability(raw: unknown): number | null {
	const verdict = parseVerdict(raw);
	return verdict ? yesOf(verdict) : null;
}

/** One candidate for the first generated token, as an inference server lists it. */
export interface TokenLogprob {
	logprob?: number;
	token?: string;
}

/**
 * P("yes") from the first generated token's top candidates: the probability
 * mass on the answer word "yes" over the mass on "yes" plus "no". A candidate
 * counts after trimming whitespace and lowercasing, so " Yes" and "yes" both
 * count. Null when neither answer word is among the candidates.
 */
export function firstTokenYes(
	top: readonly TokenLogprob[] | null | undefined
): number | null {
	let yes = 0;
	let no = 0;
	for (const { logprob, token } of top ?? []) {
		if (typeof token !== "string" || typeof logprob !== "number") {
			continue;
		}
		const word = token.trim().toLowerCase();
		if (word === "yes") {
			yes += Math.exp(logprob);
		} else if (word === "no") {
			no += Math.exp(logprob);
		}
	}
	return yes + no > 0 ? yes / (yes + no) : null;
}

const LEADING_ANSWER = /^\s*(?:yes|no)\b[\s.:,]*/iu;

/** The reply text after the answer word and its punctuation, or undefined when nothing follows. */
export function reasonAfterAnswer(
	text: string | null | undefined
): string | undefined {
	const reason = (text ?? "").replace(LEADING_ANSWER, "").trim();
	return reason === "" ? undefined : reason;
}

/**
 * The outermost `{...}` object in a reply, parsed; null when there is none.
 * Taking the span from the first `{` to the last `}` also drops any code fence
 * or prose around the object.
 */
export function extractJsonObject(text: string): unknown {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end < start) {
		return null;
	}
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}
