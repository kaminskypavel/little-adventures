// The rules for the music bed under an adventure: how loud it is and how it fades. No player here.
import type { WordTiming } from "./types";

/** How loud the bed is under the narration. */
export const BED_LOW = 0.06;
/** How loud the bed is when no one speaks: the map, the choice, holds and gaps. */
export const BED_FULL = 0.18;
/** How long the bed takes to move between the two, and to fade out. */
export const FADE_MS = 400;
/** How long the first duck after a place opens from the map takes, so the bed eases in. */
export const PLACE_EASE_MS = 1000;
/** How long the end screen plays the bed before it fades out. */
export const END_FADE_AFTER_MS = 4000;

export const bedVolume = (speaking: boolean, muted = false) => {
	if (muted) {
		return 0;
	}
	return speaking ? BED_LOW : BED_FULL;
};

/** The volume `elapsedMs` into a fade of `ms` from `from` to `to`, in a straight line. */
export function rampVolume(
	from: number,
	to: number,
	elapsedMs: number,
	ms: number = FADE_MS
) {
	if (elapsedMs >= ms) {
		return to;
	}
	return from + (to - from) * Math.max(0, elapsedMs / ms);
}

/**
 * Someone is speaking `sec` into a narration: from its first word to its last, pauses between
 * words included, so the bed does not pump on every breath. Words with no timings count from
 * the first sound to the end. Over once the narration has `finished`.
 */
export function speakingAt(
	words: WordTiming[],
	sec: number,
	length: number,
	finished: boolean
) {
	if (finished || sec <= 0) {
		return false;
	}
	const timed = words.some((word) => word.endSec > word.startSec);
	if (!timed) {
		return length <= 0 || sec < length;
	}
	return sec >= words[0].startSec && sec <= (words.at(-1)?.endSec ?? 0);
}
