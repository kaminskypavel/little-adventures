import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { motion } from "@little-adventures/native-ui/tokens";
import { useEffect } from "react";
import {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

const MISSED_TILT = -8;
const easeOut = Easing.bezier(...motion.easeOut);

/**
 * The star leans over on a miss and eases upright when the next hold starts. Reduced motion
 * sets the pose without moving.
 */
export function useMissedTilt(missed: boolean) {
	const calm = useCalm();
	const tilt = useSharedValue(0);
	useEffect(() => {
		const to = missed ? MISSED_TILT : 0;
		tilt.set(
			calm ? to : withTiming(to, { duration: motion.enter, easing: easeOut })
		);
	}, [calm, missed, tilt]);
	return useAnimatedStyle(() => ({
		transform: [{ rotate: `${tilt.get()}deg` }],
	}));
}
