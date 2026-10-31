import { Image } from "expo-image";
import { useEffect } from "react";
import {
	Platform,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { mapStone } from "./tokens";

// Width / height of each pebble cut-out.
const pebbles = {
	1: { ratio: 119 / 120, source: require("../assets/map/pebble-1.png") },
	2: { ratio: 120 / 88, source: require("../assets/map/pebble-2.png") },
	3: { ratio: 120 / 78, source: require("../assets/map/pebble-3.png") },
} as const;

// expo-image on web puts its blur and its tint on one CSS filter, so the blur drops the tint.
// There the blur goes on a wrapper instead; native keeps expo-image's own blurRadius.
const WEB = Platform.OS === "web";

/** One full-size copy of the pebble, optionally tinted (shape-following) and blurred. */
function Copy({
	blur = 0,
	source,
	tint,
	transform,
}: {
	blur?: number;
	source: number;
	tint?: string;
	transform: ViewStyle["transform"];
}) {
	return (
		<View
			style={[
				StyleSheet.absoluteFill,
				{ transform },
				WEB && blur ? { filter: `blur(${blur}px)` } : null,
			]}
		>
			<Image
				accessible={false}
				blurRadius={WEB ? 0 : blur}
				contentFit="fill"
				source={source}
				style={StyleSheet.absoluteFill}
				tintColor={tint}
			/>
		</View>
	);
}

/**
 * A flat pebble on the map, positioned by its center. Not tappable.
 * The pebble is transparent, so its shadow is a tinted copy of the same image: a box shadow would
 * draw a rectangle. `active` (the route just walked) fades in the glow, the only glow in the design.
 */
export function SteppingStone({
	active = false,
	art,
	rotate,
	style,
	variant,
	width,
}: {
	active?: boolean;
	/** Another cut-out in place of the pebble (the story map uses leaves). */
	art?: { ratio: number; source: number };
	/** Degrees. */
	rotate: number;
	style?: StyleProp<ViewStyle>;
	variant: 1 | 2 | 3;
	width: number;
}) {
	const calm = useCalm();
	const { ratio, source } = art ?? pebbles[variant];
	const glow = useSharedValue(active ? 1 : 0);
	useEffect(() => {
		glow.set(
			withTiming(active ? 1 : 0, { duration: calm ? 0 : mapStone.glowFade })
		);
	}, [active, calm, glow]);
	const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));
	const tightStyle = useAnimatedStyle(() => ({
		opacity: glow.get() * mapStone.glowTightAlpha,
	}));
	const liftStyle = useAnimatedStyle(() => ({
		opacity: glow.get() * mapStone.lift,
	}));
	const turn = { rotate: `${rotate}deg` } as const;

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					aspectRatio: ratio,
					transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
					width,
				},
				style,
			]}
		>
			<Copy
				blur={mapStone.shadowBlur}
				source={source}
				tint={mapStone.shadow}
				transform={[{ translateY: mapStone.shadowOffset }, turn]}
			/>
			<Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
				<Copy
					blur={mapStone.glowBlur}
					source={source}
					tint={mapStone.glow}
					transform={[turn, { scale: mapStone.glowScale }]}
				/>
			</Animated.View>
			<Animated.View style={[StyleSheet.absoluteFill, tightStyle]}>
				<Copy
					blur={mapStone.glowTightBlur}
					source={source}
					tint={mapStone.glow}
					transform={[turn]}
				/>
			</Animated.View>
			<Copy source={source} transform={[turn]} />
			<Animated.View style={[StyleSheet.absoluteFill, liftStyle]}>
				<Copy source={source} tint={mapStone.glow} transform={[turn]} />
			</Animated.View>
		</Animated.View>
	);
}
