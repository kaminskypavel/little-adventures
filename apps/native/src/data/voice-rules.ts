import type { PermissionStatus } from "expo-audio";
import { wavDataSize } from "./wav";

/** A spoken question stops by itself here, just under the 30 s the server takes at most. */
export const MAX_RECORD_MS = 29_000;

export const SAMPLE_RATE = 16_000;

export type MicStatus = `${PermissionStatus}`;

export interface Recorder {
	start: (onLimit: () => void) => Promise<void>;
	stop: () => Promise<Uint8Array>;
}

export const canRecord = (permission: MicStatus): boolean =>
	permission === "granted";

export const hasAudio = (wav: Uint8Array): boolean => wavDataSize(wav) > 0;

/** A press shorter than this is a tap, not a question: it is dropped with a gentle hint. */
export const MIN_HOLD_MS = 500;

export const heldLongEnough = (ms: number): boolean => ms >= MIN_HOLD_MS;

/** How long the short question on the check screen may be in the bundled sample mode. */
export const SHORT_QUESTION_CHARS = 60;

/** The transcript cut at a word to about 60 characters, with "..." when it was cut. */
export function trimQuestion(
	text: string,
	max: number = SHORT_QUESTION_CHARS
): string {
	const clean = text.trim().replace(/\s+/gu, " ");
	if (clean.length <= max) {
		return clean;
	}
	const cut = clean.slice(0, max);
	const at = cut.lastIndexOf(" ");
	return `${(at > max / 2 ? cut.slice(0, at) : cut).trimEnd()}...`;
}
