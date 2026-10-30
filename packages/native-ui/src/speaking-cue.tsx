import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { colors } from "./tokens";

// Round 7 `.speak` at 0.72 scale: 7 px bars (heights 34, 26, 18 px), 5 px gap, 4 px radius.
const BAR_WIDTH = 10;
const BAR_RADIUS = 5.5;
const GAP = 7;
const HEIGHT = 47;
const LOW = 0.35;
const HALF_CYCLE = 900;

// Height and phase (ms) of each bar. The phases stagger the three so they never move together.
const bars = [
	{ height: 47, phase: 0 },
	{ height: 36, phase: 300 },
	{ height: 25, phase: 600 },
] as const;

const talk = {
	"0%": { transform: [{ scaleY: LOW }] },
	"50%": { transform: [{ scaleY: 1 }] },
	"100%": { transform: [{ scaleY: LOW }] },
};

/** 09b: three sun bars beside the star that bounce while it reads the question. Full height, still, under reduced motion. */
export function SpeakingCue({ style }: { style?: StyleProp<ViewStyle> }) {
	const calm = useCalm();

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					alignItems: "flex-end",
					flexDirection: "row",
					gap: GAP,
					height: HEIGHT,
				},
				style,
			]}
		>
			{bars.map(({ height, phase }) => (
				<Animated.View
					key={height}
					style={[
						{
							backgroundColor: colors.sun,
							borderRadius: BAR_RADIUS,
							height,
							transformOrigin: "50% 100%",
							width: BAR_WIDTH,
						},
						calm
							? null
							: {
									animationDelay: -phase,
									animationDuration: HALF_CYCLE * 2,
									animationIterationCount: "infinite",
									animationName: talk,
									animationTimingFunction: "ease-in-out",
								},
					]}
				/>
			))}
		</View>
	);
}
