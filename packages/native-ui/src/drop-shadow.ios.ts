import type { ViewStyle } from "react-native";

/**
 * iOS has no drop-shadow filter. A layer shadow on a view without a background follows the alpha
 * of what the view draws, which is the same shape. CSS blur is twice the shadow radius.
 */
export function dropShadow(token: string): ViewStyle {
	const [x = "0", y = "0", blur = "0", , ...color] = token.split(" ");
	return {
		shadowColor: color.join(" "),
		shadowOffset: { height: Number.parseFloat(y), width: Number.parseFloat(x) },
		shadowOpacity: 1,
		shadowRadius: Number.parseFloat(blur) / 2,
	};
}
