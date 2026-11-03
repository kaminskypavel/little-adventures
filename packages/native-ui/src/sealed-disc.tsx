import type { ImageSource } from "expo-image";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { Medallion } from "./medallion";

/**
 * A place the road has not reached: its own medallion with the picture blurred out, no plate,
 * never tappable. Screen readers skip it until the road reaches it.
 */
export function SealedDisc({
	picture,
	size,
	style,
}: {
	picture: ImageSource | number | null;
	size: number;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[{ height: size, width: size }, style]}
		>
			<Medallion
				accessibilityLabel="Not reached yet"
				picture={picture}
				size={size}
				state="sealed"
			/>
		</View>
	);
}
