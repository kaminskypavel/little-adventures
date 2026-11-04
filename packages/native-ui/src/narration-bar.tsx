import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { colors, flat, type } from "./tokens";

/** The right-to-left mark (U+200F). */
const RLM = "\u200f";

const bar = flat.narration;

/**
 * 12: the words being read, the current one on a sun chip, the rest of the
 * line dimmed, and a thin progress track underneath. Flat, never tappable.
 */
export function NarrationBar({
	current,
	progress,
	rtl = false,
	style,
	words,
}: {
	/** Index into `words` of the word being spoken. */
	current: number;
	/** 0 to 1. A shared value is read on the UI thread. */
	progress: number | SharedValue<number>;
	/** Hebrew: the first word sits at the right and the line wraps from there. The layout stays as is. */
	rtl?: boolean;
	style?: StyleProp<ViewStyle>;
	words: string[];
}) {
	const fill = useAnimatedStyle(() => {
		const value = typeof progress === "number" ? progress : progress.get();
		return { width: `${Math.min(1, Math.max(0, value)) * 100}%` };
	});

	return (
		<View
			style={[
				{
					alignSelf: "stretch",
					backgroundColor: colors.plateDark,
					borderRadius: bar.radius,
					paddingBottom: bar.padBottom,
					paddingHorizontal: bar.padX,
					paddingTop: bar.padTop,
				},
				style,
			]}
		>
			<View
				accessibilityLabel={words.join(" ")}
				accessible
				style={{
					columnGap: bar.wordGap,
					flexDirection: rtl ? "row-reverse" : "row",
					flexWrap: "wrap",
				}}
			>
				{words.map((word, index) => (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: the same word can repeat, the position is the identity
						key={`${index}-${word}`}
						style={
							index === current
								? {
										backgroundColor: colors.sun,
										borderRadius: bar.chipRadius,
										paddingHorizontal: bar.chipPadX,
									}
								: { opacity: index > current ? bar.upcoming : 1 }
						}
					>
						<Text
							allowFontScaling={false}
							style={[
								type.narration,
								{ color: index === current ? colors.nowWordInk : colors.cream },
							]}
						>
							{/* Each word is its own text, laid out left to right: a right-to-left mark after it puts
							    its full stop or comma on its left, where Hebrew reads it. */}
							{`${word}${rtl ? RLM : ""}`}
						</Text>
					</View>
				))}
			</View>
			<View
				style={{
					backgroundColor: bar.trackTint,
					borderRadius: bar.trackRadius,
					height: bar.trackHeight,
					marginTop: bar.trackGap,
					overflow: "hidden",
				}}
			>
				<Animated.View
					style={[
						{
							backgroundColor: colors.sun,
							borderRadius: bar.trackRadius,
							height: "100%",
						},
						fill,
					]}
				/>
			</View>
		</View>
	);
}
