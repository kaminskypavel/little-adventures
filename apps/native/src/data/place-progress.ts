// How far through the whole place the player is: both parts together, from the first part's start
// to the last part's end. No player in here.
import { playableSec } from "./parts";
import type { Part } from "./types";

/**
 * 0 to 1 when the part at index `at` is `sec` in. `seen` holds the real length of each part that has
 * reported one; a part that has not falls back to its marked duration, then to the average of the
 * others. Failed parts count for nothing.
 */
export function placeProgress(
	parts: Part[],
	seen: number[],
	at: number,
	sec: number
) {
	const known = parts.map((part, index) =>
		part.status === "failed" ? 0 : seen[index] || playableSec(part)
	);
	const lengths = known.filter((length) => length > 0);
	const average =
		lengths.length > 0
			? lengths.reduce((a, b) => a + b, 0) / lengths.length
			: 0;
	const durations = parts.map((part, index) =>
		part.status === "failed" ? 0 : known[index] || average
	);
	const total = durations.reduce((a, b) => a + b, 0);
	if (total <= 0 || at < 0) {
		return 0;
	}
	const before = durations.slice(0, at).reduce((a, b) => a + b, 0);
	const within = Math.min(Math.max(sec, 0), durations[at] ?? 0);
	return Math.min(1, (before + within) / total);
}
