import {
	getRecordingPermissionsAsync,
	requestRecordingPermissionsAsync,
} from "expo-audio";

/** "granted", "denied" or "undetermined": what the phone says now, without asking. */
export const micPermission = async (): Promise<string> =>
	(await getRecordingPermissionsAsync()).status;

/** Asks once if the child's grown-up has never been asked; otherwise answers as it stands. */
export const askMicPermission = async (): Promise<string> =>
	(await requestRecordingPermissionsAsync()).status;
