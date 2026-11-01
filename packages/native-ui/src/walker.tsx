import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	Extrapolation,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { dropShadow } from "./drop-shadow";
import { Hop } from "./hop";
import { useCalm } from "./motion-provider";
import { motion, shadows } from "./tokens";

// The happy star on the map: 75 pt wide (DESIGN > Map components > Walker).
export const walkerSize = 75;

// Width / height of the star cut-out.
const STAR_RATIO = 420 / 418;
const star = require("../assets/characters/star.png");

// The cut-out is transparent, so the shadow follows its shape.
const walkerShadow = dropShadow(shadows.walker);

// Each hop to the next stone rises twice the standing bob and lands softly, ease-in-out.
const HOP_ARC = motion.hopHeight * 2;
const hopEase = Easing.inOut(Easing.ease);

export interface WalkerPoint {
	x: number;
	y: number;
}

/**
 * The star on the map. With one stop in `route` it stands there and bobs (`Hop`). With two or
 * more it hops through them once, stone by stone, `motion.walk` in total, then calls `onDone`.
 * Reduced motion: no hops, the star appears at the last stop. `onLand(i)` runs as the star lands
 * on stop `i` (1 to the last), so the map can light each stone as the star passes.
 */
export function Walker({
	onDone,
	onLand,
	route,
	size = walkerSize,
}: {
	onDone?: () => void;
	onLand?: (index: number) => void;
	/** Top-left corner of the star at each stop, in the parent's space. */
	route: WalkerPoint[];
	size?: number;
}) {
	const calm = useCalm();
	const leg = useSharedValue(0);
	const last = route.length - 1;
	const walking = last > 0;

	const handlers = useRef({ onDone, onLand });
	handlers.current = { onDone, onLand };
	const land = useCallback(
		(index: number) => handlers.current.onLand?.(index),
		[]
	);
	const done = useCallback(() => handlers.current.onDone?.(), []);

	const stops = useMemo(() => route.map((_, index) => index), [route]);
	const origin = route[0] ?? { x: 0, y: 0 };
	const xs = useMemo(() => route.map((p) => p.x - origin.x), [route, origin]);
	const ys = useMemo(() => route.map((p) => p.y - origin.y), [route, origin]);

	useEffect(() => {
		if (!walking) {
			return;
		}
		if (calm) {
			leg.set(last);
			for (let index = 1; index <= last; index += 1) {
				land(index);
			}
			const timer = setTimeout(done, motion.reducedReveal);
			return () => clearTimeout(timer);
		}
		const duration = motion.walk / last;
		leg.set(0);
		leg.set(
			withSequence(
				...stops.slice(1).map((stop) =>
					withTiming(stop, { duration, easing: hopEase }, (finished) => {
						"worklet";
						if (finished) {
							scheduleOnRN(land, stop);
							if (stop === last) {
								scheduleOnRN(done);
							}
						}
					})
				)
			)
		);
		return () => cancelAnimation(leg);
	}, [calm, done, land, last, leg, stops, walking]);

	const move = useAnimatedStyle(() => {
		if (stops.length < 2) {
			return {};
		}
		const at = leg.get();
		const hop = Math.sin(Math.PI * (at - Math.floor(at))) * HOP_ARC;
		return {
			transform: [
				{ translateX: interpolate(at, stops, xs, Extrapolation.CLAMP) },
				{
					translateY: interpolate(at, stops, ys, Extrapolation.CLAMP) - hop,
				},
			],
		};
	});

	const picture = (
		<Image
			accessibilityIgnoresInvertColors
			contentFit="contain"
			source={star}
			style={{ height: "100%", width: "100%" }}
		/>
	);

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					aspectRatio: STAR_RATIO,
					left: origin.x,
					position: "absolute",
					top: origin.y,
					width: size,
				},
				walkerShadow,
				move,
			]}
		>
			{walking ? (
				picture
			) : (
				<Hop style={{ height: "100%", width: "100%" }}>{picture}</Hop>
			)}
		</Animated.View>
	);
}
