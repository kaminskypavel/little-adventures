import type { ViewProps } from "react-native";

/** Native has no focus ring. The web variant adds focus-visible. */
export function useFocusRing(_enabled: boolean) {
	return { focused: false as boolean, props: {} as ViewProps };
}
