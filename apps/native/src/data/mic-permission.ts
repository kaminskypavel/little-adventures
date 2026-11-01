import {
	getRecordingPermissionsAsync,
	requestRecordingPermissionsAsync,
} from "expo-audio";
import type { MicStatus } from "./voice-rules";

export const micPermission = async (): Promise<MicStatus> =>
	(await getRecordingPermissionsAsync()).status;

/** Asks once if the child's grown-up has never been asked; otherwise answers as it stands. */
export const askMicPermission = async (): Promise<MicStatus> =>
	(await requestRecordingPermissionsAsync()).status;
