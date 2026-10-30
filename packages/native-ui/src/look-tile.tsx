import { Image } from "expo-image";
import type { StyleProp, ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Placeholder } from "./placeholder";
import { radii, select } from "./tokens";

const thumb = {
	borderRadius: select.lookThumb / 2,
	height: select.lookThumb,
	width: select.lookThumb,
} as const;

/** A look (Clay / Felt / Wood): round thumbnail over a label. Three across, gap 10, width from the parent. */
export function LookTile({
	label,
	onPress,
	picture,
	selected,
	style,
}: {
	label: string;
	onPress?: () => void;
	/** A `require()`d image, or null for the neutral placeholder. */
	picture: number | null;
	selected?: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<ClayPressable
			accessibilityLabel={label}
			accessibilityRole="button"
			onPress={onPress}
			radius={radii.card}
			selected={selected}
			style={[
				{
					alignItems: "center",
					gap: select.lookGap,
					height: select.lookHeight,
					justifyContent: "center",
				},
				style,
			]}
			tone="sage"
		>
			{picture === null ? (
				<Placeholder icon="user" iconSize={34} style={thumb} />
			) : (
				<Image
					accessibilityIgnoresInvertColors
					contentFit="cover"
					source={picture}
					style={thumb}
				/>
			)}
			<ClayText align="center" variant="lookLabel">
				{label}
			</ClayText>
		</ClayPressable>
	);
}
