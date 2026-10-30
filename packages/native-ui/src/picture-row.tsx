import { type StyleProp, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { CardPicture } from "./list-row";
import { listCards } from "./tokens";

const { pictureRow } = listCards;

/** An idea on the Pick screen: a square picture and up to three lines of title. No speaker icon. */
export function PictureRow({
	onPress,
	picture,
	style,
	title,
}: {
	onPress?: () => void;
	picture: number | null;
	style?: StyleProp<ViewStyle>;
	title: string;
}) {
	return (
		<ClayPressable
			accessibilityLabel={title}
			onPress={onPress}
			radius={pictureRow.radius}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: pictureRow.gap,
					height: pictureRow.height,
					paddingBottom: pictureRow.padBottom,
					paddingLeft: pictureRow.padLeft,
					paddingRight: pictureRow.padRight,
					paddingTop: pictureRow.padTop,
				},
				style,
			]}
			tone="sage"
		>
			<CardPicture
				height={pictureRow.picture}
				picture={picture}
				radius={pictureRow.pictureRadius}
				width={pictureRow.picture}
			/>
			<View style={{ flex: 1, minWidth: 0 }}>
				<ClayText
					numberOfLines={3}
					style={{
						fontSize: pictureRow.titleFont,
						lineHeight: pictureRow.titleLine,
					}}
					variant="title"
				>
					{title}
				</ClayText>
			</View>
		</ClayPressable>
	);
}
