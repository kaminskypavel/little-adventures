import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import type { ImageSource } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { ClayText } from "./clay-text";
import { FallbackImage } from "./fallback-image";
import { Icon } from "./icons";
import { Placeholder } from "./placeholder";
import { colors, listCards } from "./tokens";

const { choice } = listCards;
// The goodnight picture is a cut-out: it stands on its backdrop at this share of the half's height.
const GOAL_HEIGHT = "70%";
// The text over the picture sits above the star between the halves so the two never meet.
const NOTE_GAP = 10;

type HalfState = "drawing" | "locked" | "open";

/**
 * One full-height half of the sideways choice: the place's picture fills it, its name sits at the
 * bottom. Locked (a veil, a lock on the name, and `note` above it) shakes nothing but buzzes on a
 * tap; drawing is blurred and veiled and cannot be tapped. The picked half shows a sun ring.
 */
export function ChoiceHalf({
	kind = "place",
	name,
	note,
	onPress,
	picture,
	selected = false,
	state = "open",
	testID,
}: {
	kind?: "goal" | "place";
	name: string;
	/** A line over the name, like "1 more place first". */
	note?: string;
	onPress?: () => void;
	picture: ImageSource | number | null;
	selected?: boolean;
	state?: HalfState;
	testID?: string;
}) {
	const locked = state === "locked";
	const drawing = state === "drawing";
	const placeholder = (
		<Placeholder icon="image" style={StyleSheet.absoluteFill} />
	);
	const handlePress = () => {
		if (locked) {
			notificationAsync(NotificationFeedbackType.Warning);
			return;
		}
		onPress?.();
	};

	return (
		<Pressable
			accessibilityLabel={locked ? `${name}, locked` : name}
			accessibilityRole="button"
			accessibilityState={{ busy: drawing, selected }}
			disabled={drawing}
			onPress={handlePress}
			style={styles.half}
			testID={testID}
		>
			{kind === "goal" ? (
				<View style={[StyleSheet.absoluteFill, styles.goal]}>
					<FallbackImage
						blurRadius={drawing ? choice.drawingBlur : 0}
						contentFit="contain"
						kind={locked ? "goalClosed" : "goalOpen"}
						placeholder={placeholder}
						source={picture}
						style={{ height: GOAL_HEIGHT, width: "100%" }}
					/>
				</View>
			) : (
				<FallbackImage
					blurRadius={drawing ? choice.drawingBlur : 0}
					contentFit="cover"
					kind="place"
					placeholder={placeholder}
					source={picture}
					style={StyleSheet.absoluteFill}
				/>
			)}
			{drawing ? (
				<>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: choice.drawingGrayVeil },
						]}
					/>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: choice.drawingBrightnessVeil },
						]}
					/>
				</>
			) : null}
			{locked ? (
				<>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: choice.lockedGrayVeil },
						]}
					/>
					<View
						pointerEvents="none"
						style={[StyleSheet.absoluteFill, { backgroundColor: choice.dim }]}
					/>
				</>
			) : null}
			{selected ? (
				<View
					pointerEvents="none"
					style={[StyleSheet.absoluteFill, styles.ring]}
				/>
			) : null}
			<View pointerEvents="none" style={styles.foot}>
				{note ? (
					<ClayText
						align="center"
						color={colors.cream}
						style={styles.note}
						variant="label"
					>
						{note}
					</ClayText>
				) : null}
				<View style={styles.chip}>
					{locked ? (
						<Icon color={colors.inkNavy} name="lock" size={choice.chipFont} />
					) : null}
					<ClayText
						numberOfLines={1}
						style={{ flexShrink: 1, fontSize: choice.chipFont }}
						variant="title"
					>
						{name}
					</ClayText>
				</View>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	chip: {
		alignItems: "center",
		backgroundColor: colors.sand,
		borderRadius: choice.chipRadius,
		flexDirection: "row",
		gap: choice.chipGap,
		maxWidth: "84%",
		paddingBottom: choice.chipPadBottom,
		paddingHorizontal: choice.chipPadX,
		paddingTop: choice.chipPadTop,
	},
	foot: {
		alignItems: "center",
		bottom: choice.chipBottom,
		left: 0,
		position: "absolute",
		right: 0,
	},
	goal: {
		alignItems: "center",
		backgroundColor: colors.goalBackdrop,
		justifyContent: "center",
	},
	half: { flex: 1, overflow: "hidden" },
	note: { marginBottom: NOTE_GAP },
	ring: { borderColor: colors.sun, borderWidth: choice.ringWidth },
});
