import type { ImageSource } from "expo-image";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { FallbackImage } from "./fallback-image";
import { Placeholder } from "./placeholder";
import { listCards } from "./tokens";

const { list } = listCards;

/** A picture (a required module or an image source) or, when there is none or it fails, the stand-in picture. */
export function CardPicture({
	height,
	picture,
	radius,
	width,
}: {
	height: number;
	picture: ImageSource | number | null;
	radius: number;
	width: number;
}) {
	const box = { borderRadius: radius, flexShrink: 0, height, width } as const;
	const fill = { height: "100%", width: "100%" } as const;
	return (
		<View style={[box, { overflow: "hidden" }]}>
			<FallbackImage
				contentFit="cover"
				kind="place"
				placeholder={<Placeholder icon="image" style={fill} />}
				source={picture}
				style={fill}
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
