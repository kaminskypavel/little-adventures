import type { StyleProp, ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Icon, type IconName } from "./icons";
import { type ClayTone, colors, iconSizes, layout, spacing } from "./tokens";

interface ButtonProps {
	/** Defaults to the label. */
	accessibilityLabel?: string;
	disabled?: boolean;
	label: string;
	onPress?: () => void;
	selected?: boolean;
	style?: StyleProp<ViewStyle>;
	testID?: string;
	/** Override for states: "off", "locked". */
	tone?: ClayTone;
}

interface PrimaryButtonProps extends ButtonProps {
	/** 30 pt icon on the left of the label. */
	icon?: IconName;
}

function ink(tone: ClayTone) {
	return tone === "off" ? colors.offInk : colors.inkNavy;
}

/** 88 high, pill, sun clay. One per screen. Full width inside the margins. */
export function PrimaryButton({
	accessibilityLabel,
	icon,
	label,
	style,
	tone = "sun",
	...rest
}: PrimaryButtonProps) {
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label}
			radius={layout.primaryHeight / 2}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: spacing.md,
					height: layout.primaryHeight,
					justifyContent: "center",
				},
				style,
			]}
			tone={tone}
			{...rest}
		>
			{icon ? (
				<Icon color={ink(tone)} name={icon} size={iconSizes.button} />
			) : null}
			<ClayText color={ink(tone)} variant="title">
				{label}
			</ClayText>
		</ClayPressable>
	);
}

/** 80 high, pill, sage clay. Full width inside the margins. */
export function SecondaryButton({
	accessibilityLabel,
	label,
	style,
	tone = "sage",
	...rest
}: ButtonProps) {
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label}
			radius={layout.secondaryHeight / 2}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					height: layout.secondaryHeight,
					justifyContent: "center",
				},
				style,
			]}
			tone={tone}
			{...rest}
		>
			<ClayText color={ink(tone)} variant="buttonSecondary">
				{label}
			</ClayText>
		</ClayPressable>
	);
}
