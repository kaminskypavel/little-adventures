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

/**
 * P("yes") from one verdict: the confidence when the answer is yes, the
 * complement when it is no. Null for anything malformed or out of range.
 */
export function yesProbability(raw: unknown): number | null {
	const verdict = parseVerdict(raw);
	if (!verdict) {
		return null;
	}
	return verdict.answer === "yes" ? verdict.confidence : 1 - verdict.confidence;
}
