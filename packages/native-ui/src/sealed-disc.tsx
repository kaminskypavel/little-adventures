import { type StyleProp, View, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import { colors, mapSeal } from "./tokens";

/**
 * A place the road has not reached: a flat dark disc with a ring and a drawn question mark. No
 * picture, no plate, never tappable, no clay lift.
 */
export function SealedDisc({ style }: { style?: StyleProp<ViewStyle> }) {
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					alignItems: "center",
					backgroundColor: colors.deepNavy,
					borderColor: mapSeal.ring,
					borderRadius: mapSeal.size / 2,
					borderWidth: mapSeal.ringWidth,
					height: mapSeal.size,
					justifyContent: "center",
					width: mapSeal.size,
				},
				style,
			]}
		>
			<Icon color={mapSeal.iconInk} name="ask" size={mapSeal.icon} />
		</View>
	);
}
