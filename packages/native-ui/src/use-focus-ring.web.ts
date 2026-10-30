import { useState } from "react";
import type { ViewProps } from "react-native";

/**
 * Web debug preview: a focus-visible ring (keyboard focus only). Enter and Space already
 * press, because react-native-web renders the button role as a real button element.
 */
export function useFocusRing(enabled: boolean) {
	const [focused, setFocused] = useState(false);
	const props = {
		focusable: enabled,
		onBlur: () => setFocused(false),
		onFocus: (event) => {
			const target = event.nativeEvent.target as unknown as {
				matches?: (selector: string) => boolean;
			};
			setFocused(target.matches?.(":focus-visible") ?? false);
		},
	} satisfies ViewProps;
	return { focused, props: props as ViewProps };
}
