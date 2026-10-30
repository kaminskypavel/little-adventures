import { type StyleProp, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Icon } from "./icons";
import { colors, heroCard, iconSizes, radii } from "./tokens";

/**
 * New adventure / Ask your own: sun clay, a navy orb with a sun mic, a 36 pt label.
 * `off` is the mic-denied state: off clay, grey orb, crossed mic.
 */
export function HeroCard({
	accessibilityLabel,
	height = heroCard.height,
	label,
	off = false,
	onPress,
	style,
	testID,
}: {
	/** Defaults to the label with line breaks turned into spaces. */
	accessibilityLabel?: string;
	/** 180 to 190. */
	height?: number;
	/** Use "\n" for the line break, e.g. "New\nadventure". */
	label: string;
	off?: boolean;
	onPress?: () => void;
	style?: StyleProp<ViewStyle>;
	testID?: string;
}) {
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label.replace(/\n/gu, " ")}
			onPress={onPress}
			radius={radii.heroCard}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: heroCard.gap,
					height,
					paddingHorizontal: heroCard.padX,
				},
				style,
			]}
			testID={testID}
			tone={off ? "off" : "sun"}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: off ? colors.offOrb : colors.inkNavy,
					borderRadius: radii.full,
					height: heroCard.orb,
					justifyContent: "center",
					width: heroCard.orb,
				}}
			>
				<Icon
					color={off ? colors.offIcon : colors.sun}
					name={off ? "mic-off" : "mic"}
					size={iconSizes.hero}
				/>
			</View>
			<ClayText
				color={off ? colors.offInk : colors.inkNavy}
				variant="heroLabel"
			>
				{label}
			</ClayText>
		</ClayPressable>
	);
}
