import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClayText } from "./clay-text";
import { useCalm } from "./motion-provider";
import { colors, layout, motion, spacing } from "./tokens";

const [x1, y1, x2, y2] = motion.easeOut;
const enterEase = cubicBezier(x1, y1, x2, y2);

const riseIn = {
	from: { opacity: 0, transform: [{ translateY: motion.enterRise }] },
	to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const fadeIn = { from: { opacity: 0 }, to: { opacity: 1 } };

/**
 * Screen content enter: fade + rise, siblings staggered (title, body, dock).
 * A CSS animation, not a layout animation, so nothing is measured on the way in.
 */
function enter(index: number, calm: boolean) {
	if (calm) {
		return {
			animationDuration: `${motion.reducedReveal}ms`,
			animationName: fadeIn,
		} as const;
	}
	return {
		animationDelay: `${index * motion.enterStagger}ms`,
		animationDuration: `${motion.enter}ms`,
		animationFillMode: "backwards",
		animationName: riseIn,
		animationTimingFunction: enterEase,
	} as const;
}

/**
 * One kid or grown-up screen: optional top bar, a centered headline about 80 pt
 * below the screen top, the hero band, and the docked actions at the bottom.
 * The sky is mounted once in the root layout and shows through.
 */
export function Screen({
	bodyStyle,
	children,
	dim = false,
	dock,
	title,
	titleTop = layout.titleTop,
	topBar,
}: {
	bodyStyle?: StyleProp<ViewStyle>;
	children?: ReactNode;
	/** Scrim over the sky for text-heavy screens. */
	dim?: boolean;
	/** Bottom actions, stacked 14 apart (primary 88, secondary 80). */
	dock?: ReactNode;
	title?: string;
	/** Distance of the headline from the screen top. */
	titleTop?: number;
	topBar?: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const calm = useCalm();

	return (
		<View style={styles.root}>
			{dim ? (
				<View
					pointerEvents="none"
					style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
				/>
			) : null}
			{topBar ? (
				<View
					style={[
						styles.topBar,
						{ marginTop: insets.top + layout.topBarOffset },
					]}
				>
					{topBar}
				</View>
			) : null}
			{title ? (
				<Animated.View
					style={[
						styles.title,
						{ marginTop: topBar ? spacing.lg : titleTop },
						enter(0, calm),
					]}
				>
					<ClayText
						accessibilityRole="header"
						align="center"
						color={colors.cream}
						numberOfLines={2}
						variant="headline"
					>
						{title}
					</ClayText>
				</Animated.View>
			) : null}
			<Animated.View style={[styles.body, bodyStyle, enter(1, calm)]}>
				{children}
			</Animated.View>
			{dock ? (
				<Animated.View
					style={[
						styles.dock,
						{ paddingBottom: insets.bottom + layout.dockBottom },
						enter(2, calm),
					]}
				>
					{dock}
				</Animated.View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	body: { flex: 1, paddingHorizontal: layout.sideMargin },
	dock: { gap: layout.gap, paddingHorizontal: layout.sideMargin },
	root: { flex: 1 },
	title: { paddingHorizontal: layout.sideMargin },
	topBar: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		height: layout.topBarHeight,
		paddingHorizontal: layout.sideMargin,
	},
});
