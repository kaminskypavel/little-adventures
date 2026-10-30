import { Image } from "expo-image";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Placeholder } from "./placeholder";
import { listCards } from "./tokens";

const { list } = listCards;

/** A picture (a required module) or, when there is none, the neutral placeholder. */
export function CardPicture({
	height,
	picture,
	radius,
	width,
}: {
	height: number;
	picture: number | null;
	radius: number;
	width: number;
}) {
	const box = { borderRadius: radius, flexShrink: 0, height, width } as const;
	if (picture === null) {
		return <Placeholder icon="image" style={box} />;
	}
	return (
		<View style={[box, { overflow: "hidden" }]}>
			<Image
				contentFit="cover"
				source={picture}
				style={{ height: "100%", width: "100%" }}
			/>
		</View>
	);
}

/** Keep going on Home: picture, one-line title, caption such as "2 of 6 places". */
export function ListRow({
	caption,
	onPress,
	picture,
	style,
	title,
}: {
	caption: string;
	onPress?: () => void;
	picture: number | null;
	style?: StyleProp<ViewStyle>;
	title: string;
}) {
	return (
		<ClayPressable
			accessibilityLabel={`${title}, ${caption}`}
			onPress={onPress}
			radius={list.radius}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: list.gap,
					height: list.height,
					paddingLeft: list.padLeft,
					paddingRight: list.padRight,
				},
				style,
			]}
			tone="sage"
		>
			<CardPicture
				height={list.pictureHeight}
				picture={picture}
				radius={list.pictureRadius}
				width={list.pictureWidth}
			/>
			<View style={{ flex: 1, minWidth: 0 }}>
				<ClayText
					numberOfLines={1}
					style={{
						fontSize: list.titleFont,
						lineHeight: list.titleLine,
					}}
					variant="title"
				>
					{title}
				</ClayText>
				<ClayText
					numberOfLines={1}
					style={{
						fontSize: list.captionFont,
						lineHeight: list.captionLine,
						opacity: list.captionOpacity,
					}}
					tabular
					variant="label"
				>
					{caption}
				</ClayText>
			</View>
		</ClayPressable>
	);
}
