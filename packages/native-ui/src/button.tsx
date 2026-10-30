import type { ReactNode } from "react";
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

interface IconButtonProps extends ButtonProps {
	/** 30 pt icon on the left of the label. */
	icon?: IconName;
}

interface PrimaryButtonProps extends IconButtonProps {
	/** Replaces the icon: a custom mark (for example the Google G) left of the label. */
	leading?: ReactNode;
}

function ink(tone: ClayTone) {
	return tone === "off" ? colors.offInk : colors.inkNavy;
}

/**
 * 88 high, pill, sun clay. One per screen. Full width inside the margins.
 * With a `leading` mark the label drops to the secondary size and stays on one line, so it
 * fits beside a 40 pt mark inside the pill.
 */
export function PrimaryButton({
	accessibilityLabel,
	icon,
	label,
	leading,
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
					gap: leading ? spacing.sm : spacing.md,
					height: layout.primaryHeight,
					justifyContent: "center",
				},
				style,
			]}
			tone={tone}
			{...rest}
		>
			{leading ??
				(icon ? (
					<Icon color={ink(tone)} name={icon} size={iconSizes.button} />
				) : null)}
			<ClayText
				color={ink(tone)}
				numberOfLines={leading ? 1 : undefined}
				variant={leading ? "buttonSecondary" : "title"}
			>
				{label}
			</ClayText>
		</ClayPressable>
	);
}

/** 80 high, pill, sage clay. Full width inside the margins. */
export function SecondaryButton({
	accessibilityLabel,
	icon,
	label,
	style,
	tone = "sage",
	...rest
}: IconButtonProps) {
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label}
			radius={layout.secondaryHeight / 2}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: spacing.md,
					height: layout.secondaryHeight,
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
			<ClayText color={ink(tone)} variant="buttonSecondary">
				{label}
			</ClayText>
		</ClayPressable>
	);
}
