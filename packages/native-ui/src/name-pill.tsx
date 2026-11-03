import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { colors, flat, fonts } from "./tokens";

const pill = flat.namePill;
const small = flat.namePillSmall;
const NAME_SIZE = 26;

/** 12: the place name on the video's top bar. */
export function NamePill({
	compact = false,
	style,
	text,
}: {
	/** The small pill that sits in a top bar next to a button. */
	compact?: boolean;
	style?: StyleProp<ViewStyle>;
	text: string;
}) {
	if (compact) {
		return (
			<View
				style={[
					{
						alignSelf: "flex-start",
						backgroundColor: colors.namePill,
						borderRadius: small.radius,
						height: small.height,
						justifyContent: "center",
						paddingHorizontal: small.padX,
					},
					style,
				]}
			>
				<Text
					allowFontScaling={false}
					numberOfLines={1}
					style={{
						color: colors.cream,
						fontFamily: fonts.heavy,
						fontSize: small.size,
					}}
				>
					{text}
				</Text>
			</View>
		);
	}
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
				allowFontScaling={false}
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
