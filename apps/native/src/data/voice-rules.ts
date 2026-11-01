import type { PermissionStatus } from "expo-audio";
import { wavDataSize } from "./wav";

/** A spoken question stops by itself here; the server takes at most this much. */
export const MAX_RECORD_MS = 30_000;

export const SAMPLE_RATE = 16_000;

export type MicStatus = `${PermissionStatus}`;

export interface Recorder {
	start: (onLimit: () => void) => Promise<void>;
	stop: () => Promise<Uint8Array>;
}

export const canRecord = (permission: MicStatus): boolean =>
	permission === "granted";

export const hasAudio = (wav: Uint8Array): boolean => wavDataSize(wav) > 0;
