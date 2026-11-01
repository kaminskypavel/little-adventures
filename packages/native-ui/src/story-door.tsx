import type { ImageSource } from "expo-image";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { cornerStyle } from "./clay-surface";
import { FallbackImage } from "./fallback-image";
import { Icon } from "./icons";
import { Placeholder } from "./placeholder";
import { colors, homeShelf, radii } from "./tokens";

const { chip, height, innerRadius, offLeaf, pad, radius, slot, width } =
	homeShelf.door;

const LEAVES = [
	require("../assets/map/leaf-1.png"),
	require("../assets/map/leaf-2.png"),
] as const;
// The same leaves 60% grey, baked into the files because iOS has no grayscale filter.
const LEAVES_OFF = [
	require("../assets/map/leaf-1-off.png"),
	require("../assets/map/leaf-2-off.png"),
] as const;

// The arch: round on top, nearly square at the bottom.
const arch = cornerStyle(radius);

// Keys for the leaves of one door (a map has at most this many places).
const LEAF_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** A row of leaves, one per place: the first `done` are lit, the rest faint and grey. */
function Leaves({ done, total }: { done: number; total: number }) {
	return (
		<View style={styles.chip}>
			{LEAF_KEYS.slice(0, total).map((key, n) => (
				<Image
					accessible={false}
					contentFit="contain"
					key={key}
					source={(n < done ? LEAVES : LEAVES_OFF)[n % LEAVES.length]}
					style={n < done ? styles.leaf : styles.leafOff}
				/>
			))}
		</View>
	);
}

/**
 * One of the child's adventures on Home's Yours shelf: an arched clay door with its picture and,
 * on its bottom edge, a chip of leaves (one per place, lit for each place done).
 */
export function StoryDoor({
	done,
	onPress,
	picture,
	title,
	total,
}: {
	done: number;
	onPress: () => void;
	/** A required module or an image source, or null for the stand-in picture. */
	picture: ImageSource | number | null;
	title: string;
	total: number;
}) {
	return (
		<ClayPressable
			accessibilityLabel={title}
			onPress={onPress}
			radius={radius}
			style={styles.door}
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
			<Leaves done={done} total={total} />
		</ClayPressable>
	);
}

/** The first-run door: flat, dashed, a faint mic. It shows where the first question will live. */
export function EmptyDoor() {
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={styles.slot}
		>
			<Icon color={colors.cream} name="mic" size={slot.icon} />
		</View>
	);
}

/** A same-size stand-in while the shelf loads. */
export function DoorSkeleton() {
	return <View style={styles.skeleton} />;
}

const styles = StyleSheet.create({
	chip: {
		alignItems: "center",
		alignSelf: "center",
		backgroundColor: colors.sand,
		borderRadius: radii.full,
		bottom: chip.bottom,
		flexDirection: "row",
		gap: chip.leafGap,
		height: chip.height,
		paddingHorizontal: chip.padX,
		position: "absolute",
	},
	door: { height, padding: pad, width },
	fill: { height: "100%", width: "100%" },
	leaf: { height: chip.leaf, width: chip.leaf },
	leafOff: {
		height: chip.leaf,
		opacity: offLeaf,
		width: chip.leaf,
	},
	picture: {
		...cornerStyle(innerRadius),
		flex: 1,
		overflow: "hidden",
	},
	skeleton: {
		...arch,
		backgroundColor: colors.sand,
		height,
		opacity: 0.15,
		width,
	},
	slot: {
		...arch,
		alignItems: "center",
		borderColor: slot.color,
		borderStyle: "dashed",
		borderWidth: slot.border,
		height,
		justifyContent: "center",
		opacity: 0.6,
		width,
	},
});
