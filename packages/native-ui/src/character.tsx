import { Image } from "expo-image";
import { View } from "react-native";
import { dropShadow } from "./drop-shadow";
import { Hop } from "./hop";
import { shadows } from "./tokens";

// Aspect ratio (width / height) of each cut-out file.
const characters = {
	puppy: {
		ratio: 480 / 463,
		source: require("../assets/characters/puppy.png"),
	},
	star: { ratio: 420 / 418, source: require("../assets/characters/star.png") },
} as const;

export type CharacterKind = keyof typeof characters;

// The cut-outs are transparent, so the drop shadow has to follow the shape. A box shadow would
// draw a rectangle.
export const characterShadow = dropShadow(shadows.character);

/** A still cut-out of the star or the puppy, `size` wide, with the character drop shadow. */
export function Character({
	kind,
	size,
	hop = false,
}: {
	kind: CharacterKind;
	size: number;
	hop?: boolean;
}) {
	const { ratio, source } = characters[kind];
	const frame = [{ aspectRatio: ratio, width: size }, characterShadow];
	const picture = (
		<Image
			accessibilityIgnoresInvertColors
			contentFit="contain"
			source={source}
			style={{ height: "100%", width: "100%" }}
		/>
	);

	return hop ? (
		<Hop style={frame}>{picture}</Hop>
	) : (
		<View style={frame}>{picture}</View>
	);
}
