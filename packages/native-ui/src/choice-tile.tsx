import type { StyleProp, ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { radii, select } from "./tokens";

/** Girl / Boy: two across, gap 14, width from the parent. */
export function ChoiceTile({
	label,
	onPress,
	selected,
	style,
}: {
	label: string;
	onPress?: () => void;
	selected?: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<ClayPressable
			accessibilityLabel={label}
			accessibilityRole="button"
			onPress={onPress}
			radius={radii.chip}
			selected={selected}
			style={[
				{
					alignItems: "center",
					height: select.choiceHeight,
					justifyContent: "center",
				},
				style,
			]}
			tone="sage"
		>
			<ClayText align="center" variant="title">
				{label}
			</ClayText>
		</ClayPressable>
	);
}
