import { type ReactNode, useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useCalm } from "./motion-provider";
import { motion } from "./tokens";

const easeIn = Easing.bezier(0.5, 0, 0.75, 0);

/**
 * One layer of a full-screen swoosh: it rises in from 40 pt below on a soft spring (staggered by
 * `index`), and with `leaving` sinks and fades in 220 ms, then calls `onLeft` (give it to one
 * layer only). Reduced motion: no movement, instant, `onLeft` at once.
 */
export function Swoosh({
	children,
	index = 0,
	leaving = false,
	onLeft,
	style,
}: {
	children: ReactNode;
	index?: number;
	leaving?: boolean;
	onLeft?: () => void;
	style?: StyleProp<ViewStyle>;
}) {
	const calm = useCalm();
	const p = useSharedValue(0);

	useEffect(() => {
		if (calm) {
			p.set(leaving ? 0 : 1);
			if (leaving) {
				onLeft?.();
			}
		} else if (leaving) {
			p.set(
				withTiming(
					0,
					{ duration: motion.swooshExit, easing: easeIn },
					(finished) => {
						if (finished && onLeft) {
							scheduleOnRN(onLeft);
						}
					}
				)
			);
		} else {
			p.set(
				withDelay(
					index * motion.enterStagger,
					withSpring(1, {
						dampingRatio: 0.85,
						duration: motion.swooshSpring,
						reduceMotion: ReduceMotion.Never,
					})
				)
			);
		}
	}, [calm, index, leaving, onLeft, p]);

	const move = useAnimatedStyle(() => ({
		opacity: Math.min(1, Math.max(0, p.get())),
		transform: [{ translateY: (1 - p.get()) * motion.swooshRise }],
	}));

	return <Animated.View style={[style, move]}>{children}</Animated.View>;
}
