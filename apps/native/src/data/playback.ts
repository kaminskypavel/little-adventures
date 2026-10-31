import type { Place, WordTiming } from "./types";

/** A node with a clip plays it; one without shows its picture. */
export const playbackOf = (place: Pick<Place, "video">): "picture" | "video" =>
	place.video === null ? "picture" : "video";

/**
 * Which word is being said `seconds` into a narration `duration` long. The word timings lead when
 * the engine sent them; without them the words are spread evenly over the narration.
 */
export function wordIndexAt(
	words: WordTiming[],
	seconds: number,
	duration: number
): number {
	const last = words.length - 1;
	if (last < 0) {
		return 0;
	}
	if (words.some((word) => word.endSec > word.startSec)) {
		let current = 0;
		for (const [index, word] of words.entries()) {
			if (word.startSec > seconds) {
				break;
			}
			current = index;
		}
		return current;
	}
	if (duration <= 0) {
		return 0;
	}
	return Math.min(last, Math.floor((seconds / duration) * words.length));
}
