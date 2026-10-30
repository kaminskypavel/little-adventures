import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { colors, flat, fonts } from "./tokens";

const pill = flat.namePill;
const NAME_SIZE = 26;

/** 12: the place name on the video's top bar. */
export function NamePill({
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
					alignSelf: "flex-start",
					backgroundColor: colors.namePill,
					borderRadius: pill.radius,
					paddingBottom: pill.padBottom,
					paddingHorizontal: pill.padX,
					paddingTop: pill.padTop,
				},
				style,
			]}
		>
			<Text
				numberOfLines={1}
				style={{
					color: colors.cream,
					fontFamily: fonts.heavy,
					fontSize: NAME_SIZE,
				}}
			>
				{text}
			</Text>
		</View>
	);
}
