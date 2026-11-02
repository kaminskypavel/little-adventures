import { Alert } from "react-native";

export interface Option {
	destructive?: boolean;
	label: string;
	onPress: () => void;
}

/** A plain alert where there is no action sheet (Android shows three buttons at most). Cancel is added last. */
export function showMenu(title: string, options: Option[]) {
	Alert.alert(title, undefined, [
		...options.map((o) => ({
			onPress: o.onPress,
			style: o.destructive ? ("destructive" as const) : ("default" as const),
			text: o.label,
		})),
		{ style: "cancel", text: "Cancel" },
	]);
}

/** No text prompt off iOS. */
export const askText:
	| ((title: string, done: (text: string) => void) => void)
	| null = null;
