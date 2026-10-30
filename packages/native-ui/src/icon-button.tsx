import type { StyleProp, ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { Icon, type IconName } from "./icons";
import { type ClayTone, colors, iconSizes, layout, radii } from "./tokens";

/** 64 pt circle, sage clay, 30 pt icon. The label is required: there is no visible text. */
export function IconButton({
	accessibilityLabel,
	disabled,
	icon,
	onPress,
	selected,
	style,
	testID,
	tone = "sage",
}: {
	accessibilityLabel: string;
	disabled?: boolean;
	icon: IconName;
	onPress?: () => void;
	selected?: boolean;
	style?: StyleProp<ViewStyle>;
	testID?: string;
	tone?: ClayTone;
}) {
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			onPress={onPress}
			radius={radii.full}
			selected={selected}
			style={[
				{
					alignItems: "center",
					height: layout.minTarget,
					justifyContent: "center",
					width: layout.minTarget,
				},
				style,
			]}
			testID={testID}
			tone={tone}
		>
			<Icon
				color={tone === "off" ? colors.offInk : colors.inkNavy}
				name={icon}
				size={iconSizes.button}
			/>
		</ClayPressable>
	);
}
