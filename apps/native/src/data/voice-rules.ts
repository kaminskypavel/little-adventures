import { wavDataSize } from "./wav";

/** A spoken question stops by itself here; the server takes at most this much. */
export const MAX_RECORD_MS = 30_000;

/** Recording starts only when the microphone is allowed. */
export const canRecord = (permission: string): boolean =>
	permission === "granted";

/** A recording with no audio in it is never sent. */
export const hasAudio = (wav: Uint8Array): boolean => wavDataSize(wav) > 0;
