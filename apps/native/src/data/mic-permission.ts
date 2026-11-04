import {
	getRecordingPermissionsAsync,
	requestRecordingPermissionsAsync,
} from "expo-audio";
import type { MicStatus } from "./voice-rules";

/**
 * The mic was refused and the phone will not ask again, so only its Settings can turn it on. On
 * Android a first "Don't allow" can still be asked again; on iOS one refusal is final.
 */
export const micBlocked = async (): Promise<boolean> => {
	const { canAskAgain, status } = await getRecordingPermissionsAsync();
	return status === "denied" && !canAskAgain;
};

/** Asks once if the child's grown-up has never been asked; otherwise answers as it stands. */
export const askMicPermission = async (): Promise<MicStatus> =>
	(await requestRecordingPermissionsAsync()).status;
