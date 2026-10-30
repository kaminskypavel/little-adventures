import type { StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useCalm } from "./motion-provider";
import { colors } from "./tokens";

// Round 7 `.lglow`, 200 x 230 px at 0.72 scale.
export const listenGlow = {
	breathe: 3000,
	height: 319,
	peakOpacity: 1,
	peakScale: 1.1,
	restOpacity: 0.7,
	restScale: 0.92,
	width: 278,
} as const;

const breathe = {
	"0%": {
		opacity: listenGlow.restOpacity,
		transform: [{ scale: listenGlow.restScale }],
	},
	"50%": {
		opacity: listenGlow.peakOpacity,
		transform: [{ scale: listenGlow.peakScale }],
	},
	"100%": {
		opacity: listenGlow.restOpacity,
		transform: [{ scale: listenGlow.restScale }],
	},
};

/** 09a: a soft sun glow that breathes behind the listening star. Still under reduced motion. */
export function ListenGlow({ style }: { style?: StyleProp<ViewStyle> }) {
	const calm = useCalm();

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{ height: listenGlow.height, width: listenGlow.width },
				calm
					? null
					: {
							animationDuration: `${listenGlow.breathe}ms`,
							animationIterationCount: "infinite",
							animationName: breathe,
							animationTimingFunction: "ease-in-out",
						},
				style,
			]}
		>
			<Svg
				height="100%"
				preserveAspectRatio="none"
				viewBox="0 0 100 100"
				width="100%"
			>
				<Defs>
					<RadialGradient cx="50%" cy="50%" id="listen-glow" r="50%">
						<Stop offset="0" stopColor={colors.sun} stopOpacity={0.42} />
						<Stop offset="0.6" stopColor={colors.sun} stopOpacity={0.14} />
						<Stop offset="1" stopColor={colors.sun} stopOpacity={0} />
					</RadialGradient>
				</Defs>
				<Ellipse cx={50} cy={50} fill="url(#listen-glow)" rx={50} ry={50} />
			</Svg>
		</Animated.View>
	);
}
