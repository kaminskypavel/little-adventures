import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { motion } from "@little-adventures/native-ui/tokens";
import { useEffect, useState } from "react";
import {
	Easing,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const MORPH_MS = 360;
const easeOut = Easing.bezier(...motion.easeOut);

/**
 * Drives Home between rest and listening. `progress` is 0 at rest and 1 listening: the pill
 * morph, the star's rise and the words under the mic follow it (about 360 ms, ease out). `rest`
 * is how visible the rest of Home is: it fades out in 160 ms as the morph starts, and fades back
 * in over the last 160 ms of the way back. `landed` is true once the morph has arrived. Reduced
 * motion: one 200 ms cross-fade, with `progress` and `rest` moving together.
 */
export function useMorph(listening: boolean) {
	const calm = useCalm();
	const progress = useSharedValue(0);
	const rest = useSharedValue(1);
	const [landed, setLanded] = useState(false);

	useEffect(() => {
		const ms = calm ? motion.reducedReveal : MORPH_MS;
		const fade = calm ? motion.reducedReveal : motion.exit;
		if (listening) {
			rest.set(withTiming(0, { duration: fade }));
			progress.set(
				withTiming(1, { duration: ms, easing: easeOut }, (done) => {
					if (done) {
						scheduleOnRN(setLanded, true);
					}
				})
			);
			return;
		}
		setLanded(false);
		rest.set(withDelay(ms - fade, withTiming(1, { duration: fade })));
		progress.set(withTiming(0, { duration: ms, easing: easeOut }));
	}, [calm, listening, progress, rest]);

	return { landed, progress, rest };
}
