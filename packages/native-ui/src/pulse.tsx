import { type ReactNode, useEffect } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { motion } from "./tokens";

// CSS ease-in-out, the loop easing in DESIGN.md > Motion.
const easeInOut = Easing.bezier(0.42, 0, 0.58, 1);
const HALF = motion.pulse / 2;

/**
 * The choice pulse (scale 1 to 1.04 to 1 over 1120 ms) around anything, once per `play` value.
 * A new `play` value pulses again; `null` does not pulse. `delay` is ms from that moment.
 * Off under reduced motion. It adds no layout of its own.
 */
export function Pulse({
	children,
	delay = 0,
	play,
}: {
	children: ReactNode;
	delay?: number;
	play: unknown;
}) {
	const calm = useCalm();
	const scale = useSharedValue(1);

	useEffect(() => {
		if (calm || play === null) {
			return;
		}
		scale.set(
			withDelay(
				delay,
				withSequence(
					withTiming(motion.pulsePeak, { duration: HALF, easing: easeInOut }),
					withTiming(1, { duration: HALF, easing: easeInOut })
				)
			)
		);
		return () => {
			cancelAnimation(scale);
			scale.set(1);
		};
	}, [calm, delay, play, scale]);

	const style = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));

	return <Animated.View style={style}>{children}</Animated.View>;
}
