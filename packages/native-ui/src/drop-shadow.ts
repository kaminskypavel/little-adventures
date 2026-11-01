import type { ViewStyle } from "react-native";

/**
 * A shadow that follows a transparent cut-out's shape, from a `shadows` token
 * ("x y blur spread color"). The CSS drop-shadow form has no spread, so the fourth length is dropped.
 */
export function dropShadow(token: string): ViewStyle {
	const [x = "0", y = "0", blur = "0", , ...color] = token.split(" ");
	return { filter: `drop-shadow(${x} ${y} ${blur} ${color.join(" ")})` };
}
