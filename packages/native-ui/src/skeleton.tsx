import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { colors, motion, skeleton } from "./tokens";

const breathe = {
	from: { opacity: skeleton.fade },
	to: { opacity: skeleton.peak },
};

/**
 * Flat sand stand-in for content that is still loading. Give it the size of the real thing
 * (`style` carries width, height and radius) so nothing moves when the content arrives.
 * Breathes on the shimmer cadence as a CSS animation (UI thread); still under reduced motion.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
	const calm = useCalm();
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{ backgroundColor: colors.sand, opacity: skeleton.fade },
				calm
					? null
					: {
							animationDirection: "alternate",
							animationDuration: `${motion.shimmer / 2}ms`,
							animationIterationCount: "infinite",
							animationName: breathe,
							animationTimingFunction: "ease-in-out",
						},
				style,
			]}
		/>
	);
}
