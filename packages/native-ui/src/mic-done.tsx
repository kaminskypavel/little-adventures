import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { ClayPressable } from "./clay-pressable";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { colors } from "./tokens";

// Round 7 `.micdone` and `.recring` at 0.72 scale: a 96 px sun circle, 44 px mic, 4 px ring.
const SIZE = 133;
const ICON = 61;
const RING_WIDTH = 5.5;
const RING_MS = 2000;
const RING_REACH = 1.55;
const RING_START = 0.8;
const RING_STILL = 0.5;

const ring = {
	from: { opacity: RING_START, transform: [{ scale: 1 }] },
	to: { opacity: 0, transform: [{ scale: RING_REACH }] },
};

/**
 * 09a: the one big "I'm done" mic. Sun clay circle with a ring that keeps spreading out and
 * fading while it listens. Under reduced motion the ring stays still at half strength.
 */
export function MicDone({
	accessibilityLabel = "Done, send my question",
	disabled,
	onPress,
	style,
}: {
	accessibilityLabel?: string;
	disabled?: boolean;
	onPress?: () => void;
	style?: StyleProp<ViewStyle>;
}) {
	const calm = useCalm();

	return (
		<View style={[{ alignSelf: "center", height: SIZE, width: SIZE }, style]}>
			<Animated.View
				pointerEvents="none"
				style={[
					{
						borderColor: colors.sun,
						borderRadius: SIZE / 2,
						borderWidth: RING_WIDTH,
						height: SIZE,
						position: "absolute",
						width: SIZE,
					},
					calm
						? { opacity: RING_STILL }
						: {
								animationDuration: `${RING_MS}ms`,
								animationIterationCount: "infinite",
								animationName: ring,
								animationTimingFunction: "ease-out",
							},
				]}
			/>
			<ClayPressable
				accessibilityLabel={accessibilityLabel}
				disabled={disabled}
				onPress={onPress}
				radius={SIZE / 2}
				style={{
					alignItems: "center",
					height: SIZE,
					justifyContent: "center",
					width: SIZE,
				}}
				tone="sun"
			>
				<Icon color={colors.inkNavy} name="mic" size={ICON} />
			</ClayPressable>
		</View>
	);
}
