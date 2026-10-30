import type { StyleProp, ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { radii, select } from "./tokens";

/** Age chips (`number`) and the grown-ups row Edit / Redraw / Delete photo (`label`). Width comes from the parent. */
export function Chip({
	accessibilityLabel,
	label,
	onPress,
	selected,
	size = "number",
	style,
}: {
	accessibilityLabel?: string;
	label: string;
	onPress?: () => void;
	selected?: boolean;
	size?: "label" | "number";
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityRole="button"
			onPress={onPress}
			radius={radii.chip}
			selected={selected}
			style={[
				{
					alignItems: "center",
					height: select.chipHeight,
					justifyContent: "center",
				},
				style,
			]}
			tone="sage"
		>
			<ClayText
				align="center"
				numberOfLines={1}
				tabular={size === "number"}
				variant={size === "number" ? "title" : "label"}
			>
				{label}
			</ClayText>
		</ClayPressable>
	);
}
