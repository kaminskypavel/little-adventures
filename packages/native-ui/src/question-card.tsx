import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { colors, flat, fonts } from "./tokens";

const card = flat.questionCard;

/** 09b: the question read back, on a big flat sand card. */
export function QuestionCard({
	style,
	text,
}: {
	style?: StyleProp<ViewStyle>;
	text: string;
}) {
	return (
		<View
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					backgroundColor: colors.sand,
					borderRadius: card.radius,
					justifyContent: "center",
					minHeight: card.minHeight,
					paddingHorizontal: card.padX,
					paddingVertical: card.padY,
				},
				style,
			]}
		>
			<Text
				style={{
					color: colors.inkNavy,
					fontFamily: fonts.heavy,
					fontSize: card.size,
					lineHeight: card.size * card.lineHeight,
					textAlign: "center",
				}}
			>
				{text}
			</Text>
		</View>
	);
}
