import { StyleSheet, View } from "react-native";
import { Character } from "./character";
import { ClayText } from "./clay-text";
import { IconButton } from "./icon-button";
import type { IconName } from "./icons";
import { Skeleton } from "./skeleton";
import { StarTake, type StarTakeName } from "./star-take";
import { colors, radii, type as typeScale } from "./tokens";

const AVATAR = 61;
const AVATAR_STAR = 51;
const TITLE_BAR_WIDTH = 170;
const TITLE_BAR_RATIO = 0.8;

/**
 * Top bar row for Home, the map and Grown-ups: optional star avatar, a title,
 * and one icon button at the right (lock to Grown-ups, or close).
 * With `take` the avatar star is live (one gesture, then idle); a new `takeRun` plays it again.
 * Without it the star is still.
 * Place it in `Screen`'s `topBar` slot.
 */
export function TopBar({
	action,
	avatar = false,
	take,
	takeRun = 0,
	title,
}: {
	action?: {
		accessibilityLabel: string;
		icon: IconName;
		onPress: () => void;
	};
	avatar?: boolean;
	/** Makes the avatar star live: it plays this gesture when it appears, then rests on idle. */
	take?: StarTakeName;
	/** Change it to play `take` again. */
	takeRun?: number;
	/** Null while the name loads: a bar the size of the title line stands in. */
	title: string | null;
}) {
	return (
		<>
			{avatar ? (
				<View style={styles.avatar}>
					{take ? (
						<StarTake key={takeRun} size={AVATAR_STAR} take={take} />
					) : (
						<Character kind="star" size={AVATAR_STAR} />
					)}
				</View>
			) : null}
			{title === null ? (
				<View style={styles.titleSlot}>
					<Skeleton style={styles.titleBar} />
				</View>
			) : (
				<ClayText
					accessibilityRole="header"
					color={colors.cream}
					numberOfLines={1}
					style={styles.title}
					variant="title"
				>
					{title}
				</ClayText>
			)}
			{action ? (
				<IconButton
					accessibilityLabel={action.accessibilityLabel}
					icon={action.icon}
					onPress={action.onPress}
				/>
			) : null}
		</>
	);
}

const styles = StyleSheet.create({
	avatar: {
		alignItems: "center",
		backgroundColor: colors.sun,
		borderRadius: radii.full,
		height: AVATAR,
		justifyContent: "flex-end",
		overflow: "hidden",
		paddingBottom: 3,
		width: AVATAR,
	},
	title: { flex: 1 },
	titleBar: {
		borderRadius: radii.full,
		height: typeScale.title.fontSize * TITLE_BAR_RATIO,
		width: TITLE_BAR_WIDTH,
	},
	titleSlot: {
		flex: 1,
		height: typeScale.title.lineHeight,
		justifyContent: "center",
	},
});
