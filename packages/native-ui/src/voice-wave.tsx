import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { colors } from "./tokens";

// Round 7 `.wave` at 0.72 scale: 76 px tall, 9 px bars, 5 px radius.
const BAR_WIDTH = 12.5;
const BAR_HEIGHT = 106;
const BAR_RADIUS = 7;
const LOW = 0.14;

// Peak height (as a share of the bar), half cycle and phase in seconds, copied from round 7's
// markup (`--m`, `--du`, `--dl`). A bar rises to its peak and falls back, forever.
const bars = [
	[0.38, 0.72, -0.14],
	[0.46, 0.5, -0.5],
	[0.54, 0.55, -0.55],
	[0.59, 0.52, -0.38],
	[0.67, 0.77, -0.73],
	[0.68, 0.64, -0.11],
	[0.79, 1.05, -0.59],
	[0.89, 0.73, -0.75],
	[0.85, 0.67, -0.67],
	[0.88, 0.75, -0.09],
	[0.76, 0.63, -0.28],
	[0.75, 0.62, -0.89],
	[0.68, 0.53, -0.38],
	[0.58, 0.51, -0.42],
	[0.54, 0.57, -0.6],
	[0.44, 0.85, -0.9],
	[0.38, 0.5, -0.08],
] as const;

/** One full rise and fall in a single run, started part way in by the phase. */
function barMotion([peak, half, phase]: (typeof bars)[number]) {
	const cycle = half * 2;
	return {
		animationDelay: -(Math.abs(phase) % cycle) * 1000,
		animationDuration: cycle * 1000,
		animationIterationCount: "infinite",
		animationName: {
			"0%": { transform: [{ scaleY: LOW }] },
			"50%": { transform: [{ scaleY: peak }] },
			"100%": { transform: [{ scaleY: LOW }] },
		},
		animationTimingFunction: "ease-in-out",
	} as const;
}

const motions = bars.map(barMotion);

/**
 * 09a: the voice wave. 17 sun bars that rise and fall on their own beat (the microphone is
 * not wired yet). Fills the width it is given. Still, at each bar's peak, under reduced motion.
 */
export function VoiceWave({ style }: { style?: StyleProp<ViewStyle> }) {
	const calm = useCalm();

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					alignItems: "center",
					flexDirection: "row",
					height: BAR_HEIGHT,
					justifyContent: "space-between",
				},
				style,
			]}
		>
			{bars.map(([peak], index) => (
				<Animated.View
					// The list never changes order.
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed list of 17 bars
					key={index}
					style={[
						{
							backgroundColor: colors.sun,
							borderRadius: BAR_RADIUS,
							height: BAR_HEIGHT,
							transform: [{ scaleY: peak }],
							width: BAR_WIDTH,
						},
						calm ? null : motions[index],
					]}
				/>
			))}
		</View>
	);
}
