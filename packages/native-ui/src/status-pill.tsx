import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	ReduceMotion,
} from "react-native-reanimated";
import { colors, flat, fonts } from "./tokens";

const pill = flat.statusPill;
const STATUS_SIZE = 24;

/**
 * 10a: the wait status on a dark pill. When the text changes the old pill
 * fades out while the new one fades in (200 ms). The fade stays under reduced
 * motion: a reveal becomes an opacity fade.
 */
export function StatusPill({
	style,
	text,
}: {
	style?: StyleProp<ViewStyle>;
	text: string;
}) {
	return (
		<View style={[{ alignItems: "center", alignSelf: "stretch" }, style]}>
			<Animated.View
				entering={FadeIn.duration(pill.fade).reduceMotion(ReduceMotion.Never)}
				exiting={FadeOut.duration(pill.fade).reduceMotion(ReduceMotion.Never)}
				key={text}
				style={{
					backgroundColor: colors.statusPill,
					borderRadius: pill.radius,
					paddingBottom: pill.padBottom,
					paddingHorizontal: pill.padX,
					paddingTop: pill.padTop,
				}}
			>
				<Text
					allowFontScaling={false}
					style={{
						color: colors.sun,
						fontFamily: fonts.label,
						fontSize: STATUS_SIZE,
					}}
				>
					{text}
				</Text>
			</Animated.View>
		</View>
	);
}
