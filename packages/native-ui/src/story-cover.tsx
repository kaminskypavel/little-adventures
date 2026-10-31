import { Image, type ImageSource } from "expo-image";
import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { Icon } from "./icons";
import { Placeholder } from "./placeholder";
import { colors, fonts, radii, storyCover } from "./tokens";

const {
	captionFont,
	captionGap,
	captionOpacity,
	check,
	lineHeight,
	pad,
	pictureRadius,
	plate,
} = storyCover;

/**
 * A picture-first cover: the title (and an optional caption) on a sand plate over the picture.
 * `shelf` is the fixed-width cover of Home's sideways shelf; `grid` fills its column in the Library.
 * `done` adds the check disc at the top right.
 */
export function StoryCover({
	caption,
	done = false,
	onPress,
	picture,
	size,
	style,
	title,
}: {
	caption?: string;
	done?: boolean;
	onPress?: () => void;
	/** A required module or an image source, or null for the neutral placeholder. */
	picture: ImageSource | number | null;
	size: "grid" | "shelf";
	style?: StyleProp<ViewStyle>;
	title: string;
}) {
	const dims = storyCover[size];
	const width = size === "shelf" ? storyCover.shelf.width : undefined;
	return (
		<ClayPressable
			accessibilityLabel={caption ? `${title}, ${caption}` : title}
			onPress={onPress}
			radius={storyCover.radius}
			style={[{ height: dims.height, padding: pad, width }, style]}
			tone="sage"
		>
			{picture === null ? (
				<Placeholder style={{ borderRadius: pictureRadius, flex: 1 }} />
			) : (
				<View
					style={{ borderRadius: pictureRadius, flex: 1, overflow: "hidden" }}
				>
					<Image
						accessible={false}
						contentFit="cover"
						source={picture}
						style={{ height: "100%", width: "100%" }}
					/>
				</View>
			)}
			{done ? (
				<View
					style={{
						alignItems: "center",
						backgroundColor: colors.sun,
						borderRadius: radii.full,
						boxShadow: check.shadow,
						height: check.disc,
						justifyContent: "center",
						position: "absolute",
						right: check.inset,
						top: check.inset,
						width: check.disc,
					}}
				>
					<Icon color={colors.inkNavy} name="check" size={check.icon} />
				</View>
			) : null}
			<View
				style={{
					backgroundColor: colors.sand,
					borderRadius: plate.radius,
					bottom: plate.bottom,
					left: plate.inset,
					paddingBottom: dims.plateBottomPad,
					paddingHorizontal: plate.padX,
					paddingTop: dims.plateTopPad,
					position: "absolute",
					right: plate.inset,
				}}
			>
				<Text
					style={{
						color: colors.inkNavy,
						fontFamily: fonts.heavy,
						fontSize: dims.titleFont,
						lineHeight: dims.titleFont * lineHeight,
						textAlign: "center",
					}}
				>
					{title}
				</Text>
				{caption ? (
					<Text
						style={{
							color: colors.inkNavy,
							fontFamily: fonts.label,
							fontSize: captionFont,
							fontVariant: ["tabular-nums"],
							lineHeight: captionFont * lineHeight,
							marginTop: captionGap,
							opacity: captionOpacity,
							textAlign: "center",
						}}
					>
						{caption}
					</Text>
				) : null}
			</View>
		</ClayPressable>
	);
}
