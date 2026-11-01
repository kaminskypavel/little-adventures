import {
	Platform,
	StyleSheet,
	Text,
	type TextProps,
	type TextStyle,
} from "react-native";
import { colors, type } from "./tokens";

// Nunito's own line height: (ascender 1011 + descender 353) / 1000 em.
const NUNITO_LINE = 1.364;

/**
 * iOS only. A lineHeight tighter than the font's own height is drawn with the glyphs at the bottom
 * of the line, while the web splits the difference above and below (React Native centres only
 * lines at least as tall as the font). Every type style here is that tight, so iOS showed text
 * about 4 pt higher than the web: in buttons, headlines, everywhere. Moving the glyphs down by
 * the difference puts them where the web does; the line box (layout) stays the same.
 */
export function iosTextNudge(
	style: TextStyle | null | undefined
): TextStyle | null {
	const { fontSize, lineHeight } = style ?? {};
	if (Platform.OS !== "ios" || !(fontSize && lineHeight)) {
		return null;
	}
	const fontLine = fontSize * NUNITO_LINE;
	if (lineHeight >= fontLine) {
		return null;
	}
	return { transform: [{ translateY: (fontLine - lineHeight) / 2 }] };
}

type ClayTextProps = TextProps & {
	align?: "center" | "left" | "right";
	color?: string;
	/** Tabular numerals, for ages and "2 of 6". */
	tabular?: boolean;
	variant: keyof typeof type;
};

export function ClayText({
	align,
	color = colors.inkNavy,
	style,
	tabular,
	variant,
	...rest
}: ClayTextProps) {
	const merged = StyleSheet.flatten([type[variant], style]);
	return (
		<Text
			style={[
				type[variant],
				{ color, textAlign: align },
				tabular ? { fontVariant: ["tabular-nums"] } : null,
				style,
				iosTextNudge(merged),
			]}
			{...rest}
		/>
	);
}
