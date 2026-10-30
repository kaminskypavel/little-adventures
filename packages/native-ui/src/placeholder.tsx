import { type StyleProp, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./icons";
import { colors } from "./tokens";

const ICON_OPACITY = 0.4;

/**
 * Neutral stand-in for a picture we may not show (a child's likeness, or art
 * that is not made yet). Fills its box; size and radius come from `style`.
 */
export function Placeholder({
	icon = "image",
	iconSize = 30,
	style,
}: {
	icon?: IconName;
	iconSize?: number;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<View
			style={[
				{
					alignItems: "center",
					backgroundColor: colors.deepNavy,
					justifyContent: "center",
					overflow: "hidden",
				},
				style,
			]}
		>
			<View style={{ opacity: ICON_OPACITY }}>
				<Icon color={colors.cream} name={icon} size={iconSize} />
			</View>
		</View>
	);
}
