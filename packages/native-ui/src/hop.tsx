import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { motion } from "./tokens";

const hop = {
	"0%": { transform: [{ translateY: 0 }] },
	"50%": { transform: [{ translateY: -motion.hopHeight }] },
	"100%": { transform: [{ translateY: 0 }] },
};

/** Star and puppy bob: up 7 pt and back, 2800 ms, forever. Still under reduced motion. */
export function Hop({
	children,
	style,
}: {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
}) {
	const calm = useCalm();
	return (
		<Animated.View
			style={[
				calm
					? null
					: {
							animationDuration: `${motion.hop}ms`,
							animationIterationCount: "infinite",
							animationName: hop,
							animationTimingFunction: "ease-in-out",
						},
				style,
			]}
		>
			{children}
		</Animated.View>
	);
}
