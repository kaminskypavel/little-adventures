import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Icon, type IconName } from "./icons";
import {
	type ButtonSize,
	buttonSizes,
	type ClayTone,
	colors,
	spacing,
} from "./tokens";

interface ButtonProps {
	/** Defaults to the label. */
	accessibilityLabel?: string;
	disabled?: boolean;
	label: string;
	onPress?: () => void;
	selected?: boolean;
	/** sm / md / lg, like Tailwind: lg (the default) is the child-sized button. */
	size?: ButtonSize;
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
	/** Replaces the label's size (in pt): for a button squeezed into a tight screen. */
	labelSize?: number;
	/** Replaces the icon: a custom mark (for example the Google G) left of the label. */
	leading?: ReactNode;
}

function ink(tone: ClayTone) {
	// Sign in with Apple: logo and title are black on the white button.
	if (tone === "white") {
		return colors.black;
	}
	if (tone === "danger") {
		return colors.cream;
	}
	return tone === "off" ? colors.offInk : colors.inkNavy;
}

// Beside a mark the label steps down a little, so mark and label sit clear of the pill's ends.
const LEADING_LABEL = { fontSize: 24, lineHeight: 26 } as const;

const labelStyle = (labelSize?: number) =>
	labelSize ? { fontSize: labelSize, lineHeight: labelSize * 1.1 } : undefined;

/** The label's text style per size: lg keeps each button's own, md and sm step down. */
const labelVariant = (size: ButtonSize, lg: "buttonSecondary" | "title") => {
	if (size === "sm") {
		return "label";
	}
	return size === "md" ? "buttonSecondary" : lg;
};

/**
 * 88 high, pill, sun clay. One per screen. Full width inside the margins.
 * With a `leading` mark the label drops to the secondary size and stays on one line, so it
 * fits beside a 32 pt mark inside the pill.
 */
export function PrimaryButton({
	accessibilityLabel,
	icon,
	label,
	labelSize,
	leading,
	size = "lg",
	style,
	tone = "sun",
	...rest
}: PrimaryButtonProps) {
	const dims = buttonSizes[size];
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label}
			radius={dims.primary / 2}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: leading ? spacing.sm : dims.gap,
					height: dims.primary,
					justifyContent: "center",
				},
				style,
			]}
			tone={tone}
			{...rest}
		>
			{leading ??
				(icon ? <Icon color={ink(tone)} name={icon} size={dims.icon} /> : null)}
			<ClayText
				color={ink(tone)}
				numberOfLines={leading || size !== "lg" ? 1 : undefined}
				style={leading ? LEADING_LABEL : labelStyle(labelSize)}
				variant={labelVariant(size, leading ? "buttonSecondary" : "title")}
			>
				{label}
			</ClayText>
		</ClayPressable>
	);
}

const FULL_WIDTH_LABEL = { flex: 1, textAlign: "center" } as const;

/** 80 high, pill, sage clay. Full width inside the margins. */
export function SecondaryButton({
	accessibilityLabel,
	icon,
	label,
	size = "lg",
	style,
	tone = "sage",
	...rest
}: IconButtonProps) {
	const dims = buttonSizes[size];
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label}
			radius={dims.secondary / 2}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: dims.gap,
					height: dims.secondary,
					justifyContent: "center",
				},
				style,
			]}
			tone={tone}
			{...rest}
		>
			{icon ? <Icon color={ink(tone)} name={icon} size={dims.icon} /> : null}
			{/* One line that shrinks a little rather than wraps: Android can measure a heavy label a
			    hair short and push its last word onto a hidden second line ("Try as a"). */}
			<ClayText
				adjustsFontSizeToFit
				color={ink(tone)}
				minimumFontScale={0.85}
				numberOfLines={1}
				// A full-width button without an icon gives its label the whole width, so Android has
				// room to spare and never drops the last word ("Try as a" for "Try as a guest").
				style={icon || size !== "lg" ? undefined : FULL_WIDTH_LABEL}
				// Beside an icon the label hugs its words, so Android's default high-quality breaking,
				// which measures this heavy font a hair short, dropped the last one ("Turn on the").
				textBreakStrategy="simple"
				variant={labelVariant(size, "buttonSecondary")}
			>
				{label}
			</ClayText>
		</ClayPressable>
	);
}
