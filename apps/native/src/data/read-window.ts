/** The most words the read-along card shows at once: about three lines at the narration size. */
const WINDOW_WORDS = 12;

const SENTENCE_END = /[.!?]["')’”]*$/u;

/**
 * The slice of `words` the read-along card shows while word `current` is spoken: the sentence it
 * is in. A sentence longer than `max` words is cut into fixed chunks, so the window changes only
 * when the highlight crosses a chunk edge instead of sliding on every word. `end` is exclusive.
 */
export function readWindow(
	words: string[],
	current: number,
	max = WINDOW_WORDS
): { end: number; start: number } {
	if (words.length === 0) {
		return { end: 0, start: 0 };
	}
	const at = Math.min(Math.max(current, 0), words.length - 1);
	let start = at;
	while (start > 0 && !SENTENCE_END.test(words[start - 1] ?? "")) {
		start -= 1;
	}
	let end = at;
	while (end < words.length - 1 && !SENTENCE_END.test(words[end] ?? "")) {
		end += 1;
	}
	const chunk = start + Math.floor((at - start) / max) * max;
	return { end: Math.min(end + 1, chunk + max), start: chunk };
}
