import type { ReactNode } from "react";
import { StyleSheet, Text, type TextStyle, View } from "react-native";
import { colors, speechPlate } from "./tokens";

// Web balances the lines; native has no such style and breaks them as usual.
const balance = { textWrap: "balance" } as unknown as TextStyle;

const { maxWidth, padX, padY, radius, tail, type } = speechPlate;

/**
 * The star's speech plate: flat sand, navy text, a tail pointing down at the star. It takes
 * `maxWidth` pt at most and is pinned by its tail, so a longer line grows upward.
 */
export function SpeechPlate({
	children,
	width = maxWidth,
}: {
	children: string;
	/** Defaults to the design width; pass less on a narrow phone. */
	width?: number;
}): ReactNode {
	return (
		<View style={[styles.plate, { width }]}>
			<Text
				accessibilityRole="header"
				adjustsFontSizeToFit
				allowFontScaling={false}
				minimumFontScale={0.7}
				numberOfLines={2}
				style={styles.text}
			>
				{children}
			</Text>
			<View style={styles.tail} />
		</View>
	);
}

const styles = StyleSheet.create({
	plate: {
		alignSelf: "center",
		backgroundColor: colors.sand,
		borderRadius: radius,
		paddingHorizontal: padX,
		paddingVertical: padY,
	},
	tail: {
		alignSelf: "center",
		borderColor: "transparent",
		borderLeftWidth: tail,
		borderRightWidth: tail,
		borderTopColor: colors.sand,
		borderTopWidth: tail,
		bottom: -tail + 1,
		height: 0,
		position: "absolute",
		width: 0,
	},
	text: {
		...type,
		color: colors.inkNavy,
		textAlign: "center",
		...balance,
	},
});
