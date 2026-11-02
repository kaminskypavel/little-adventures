import type { PermissionStatus } from "expo-audio";
import { wavDataSize } from "./wav";

/** A spoken question stops by itself here, just under the 30 s the server takes at most. */
export const MAX_RECORD_MS = 29_000;

export const SAMPLE_RATE = 16_000;

export type MicStatus = `${PermissionStatus}`;

export interface Recorder {
	/** How loud the child is right now, 0 (quiet) to 1 (loud). Read about every METER_MS while recording. */
	level: number;
	start: (onLimit: () => void) => Promise<void>;
	stop: () => Promise<Uint8Array>;
}

/** How often the voice level is read while recording. */
export const METER_MS = 60;

const QUIET_DB = -50;
const LOUD_DB = -10;

/** Maps a metering value in dB (about -160 to 0) to 0..1: speech sits between -50 and -10 dB. */
export const levelFromDb = (db: number | undefined): number => {
	if (db === undefined || !Number.isFinite(db)) {
		return 0;
	}
	return Math.min(1, Math.max(0, (db - QUIET_DB) / (LOUD_DB - QUIET_DB)));
};

export const canRecord = (permission: MicStatus): boolean =>
	permission === "granted";

export const hasAudio = (wav: Uint8Array): boolean => wavDataSize(wav) > 0;

/** A press shorter than this is a tap, not a question: it is dropped with a gentle hint. */
const MIN_HOLD_MS = 500;

export const heldLongEnough = (ms: number): boolean => ms >= MIN_HOLD_MS;

/** How long the short question on the check screen may be in the bundled sample mode. */
const SHORT_QUESTION_CHARS = 60;

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
