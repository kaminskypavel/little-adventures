import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { colors, flat } from "./tokens";

const bar = flat.progress;

/** 10a: the wait screen's thin bar. The fill width follows the shared value on the UI thread. */
export function ProgressBar({
	progress,
	style,
}: {
	/** 0 to 1. */
	progress: number | SharedValue<number>;
	style?: StyleProp<ViewStyle>;
}) {
	const fill = useAnimatedStyle(() => {
		const value = typeof progress === "number" ? progress : progress.get();
		return { width: `${Math.min(1, Math.max(0, value)) * 100}%` };
	});

	return (
		<Animated.View
			style={[
				{
					alignSelf: "stretch",
					backgroundColor: bar.track,
					borderRadius: bar.radius,
					height: bar.height,
					overflow: "hidden",
				},
				style,
			]}
		>
			<Animated.View
				style={[{ backgroundColor: colors.sun, height: "100%" }, fill]}
			/>
		</Animated.View>
	);
}
