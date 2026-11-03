import { ActionSheetIOS, Alert } from "react-native";
import { tNow } from "@/src/i18n";
import { showMenuStrings } from "@/src/i18n/strings/show-menu";

export interface Option {
	destructive?: boolean;
	label: string;
	onPress: () => void;
}

/** The system action sheet. Cancel is added last. */
export function showMenu(title: string, options: Option[]) {
	const destructive = options.findIndex((o) => o.destructive);
	ActionSheetIOS.showActionSheetWithOptions(
		{
			cancelButtonIndex: options.length,
			destructiveButtonIndex: destructive < 0 ? undefined : destructive,
			options: [
				...options.map((o) => o.label),
				tNow(showMenuStrings, "cancel"),
			],
			title,
		},
		(index) => options[index]?.onPress()
	);
}

/** The system text prompt (iOS only). */
export const askText:
	| ((title: string, done: (text: string) => void) => void)
	| null = (title, done) => Alert.prompt(title, undefined, done, "plain-text");
