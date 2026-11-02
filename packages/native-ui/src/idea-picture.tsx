import type { ImageSource } from "expo-image";
import { StyleSheet, View } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { FallbackImage } from "./fallback-image";
import { Placeholder } from "./placeholder";
import { colors, homeShelf, radii } from "./tokens";

const { pad, size } = homeShelf.idea;

/**
 * An idea on Home's Ideas shelf: a round picture in a clay rim. Picture only; the question is its
 * accessibility label.
 */
export function IdeaPicture({
	onPress,
	picture,
	question,
	testID,
}: {
	onPress: () => void;
	/** A required module or an image source, or null for the stand-in picture. */
	picture: ImageSource | number | null;
	question: string;
	testID?: string;
}) {
	return (
		<ClayPressable
			accessibilityLabel={question}
			onPress={onPress}
			radius={size / 2}
			style={styles.ring}
			testID={testID}
			tone="sage"
		>
			<View style={styles.picture}>
				<FallbackImage
					accessible={false}
					contentFit="cover"
					kind="place"
					placeholder={<Placeholder style={styles.fill} />}
					source={picture}
					style={styles.fill}
				/>
			</View>
		</ClayPressable>
	);
}

/** A same-size stand-in while the shelf loads. */
export function IdeaSkeleton() {
	return <View style={styles.skeleton} />;
}

const styles = StyleSheet.create({
	fill: { height: "100%", width: "100%" },
	picture: {
		borderRadius: radii.full,
		flex: 1,
		overflow: "hidden",
	},
	ring: { height: size, padding: pad, width: size },
	skeleton: {
		backgroundColor: colors.sand,
		borderRadius: size / 2,
		height: size,
		opacity: 0.15,
		width: size,
	},
});
