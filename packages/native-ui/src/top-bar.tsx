import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Character } from "./character";
import { ClayText } from "./clay-text";
import { IconButton } from "./icon-button";
import type { IconName } from "./icons";
import { StarTake, type StarTakeName } from "./star-take";
import { TitleHold } from "./title-hold";
import { colors, radii } from "./tokens";

const AVATAR = 61;
const AVATAR_STAR = 51;
// Compact (Home): a 56 pt avatar in a faint cream ring, and no title.
const COMPACT_AVATAR = 56;
const COMPACT_STAR = 47;
const RING = "0px 0px 0px 3px rgba(244,236,216,0.28)";

/**
 * Top bar row for Home, the map and Grown-ups: optional avatar (the star, or the child's drawing), a title,
 * and one icon button at the right (lock to Grown-ups, or close).
 * With `take` the avatar star is live (one gesture, then idle); a new `takeRun` plays it again.
 * Without it the star is still.
 * Place it in `Screen`'s `topBar` slot.
 */
export function TopBar({
	action,
	avatar = false,
	avatarUrl,
	compact = false,
	onTitleLongPress,
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
	/** The child's drawn picture. Shown instead of the star; the star stays when it is missing or fails to load. */
	avatarUrl?: string | null;
	/** A 56 pt avatar with a cream ring, and no title: the lock stays at the right. */
	compact?: boolean;
	/** A 1 s hold on the title. Defaults to the app's `TitleHoldProvider` action. */
	onTitleLongPress?: () => void;
	/** Makes the avatar star live: it plays this gesture when it appears, then rests on idle. */
	take?: StarTakeName;
	/** Change it to play `take` again. */
	takeRun?: number;
	title?: string;
}) {
	// The failed url is remembered, so a new url is tried again.
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const starSize = compact ? COMPACT_STAR : AVATAR_STAR;
	const picture = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;
	let art: ReactNode = <Character kind="star" size={starSize} />;
	if (picture) {
		art = (
			<Image
				accessibilityIgnoresInvertColors
				contentFit="cover"
				onError={() => setFailedUrl(picture)}
				source={{ uri: picture }}
				style={styles.picture}
			/>
		);
	} else if (take) {
		art = <StarTake key={takeRun} size={starSize} take={take} />;
	}
	return (
		<>
			{avatar ? (
				<View style={compact ? styles.compact : styles.avatar}>{art}</View>
			) : null}
			{compact ? (
				<View style={styles.title} />
			) : (
				<TitleHold onTitleLongPress={onTitleLongPress} style={styles.title}>
					<ClayText
						accessibilityRole="header"
						color={colors.cream}
						numberOfLines={1}
						variant="title"
					>
						{title}
					</ClayText>
				</TitleHold>
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
	compact: {
		alignItems: "center",
		backgroundColor: colors.sun,
		borderRadius: radii.full,
		boxShadow: RING,
		height: COMPACT_AVATAR,
		justifyContent: "flex-end",
		overflow: "hidden",
		paddingBottom: 3,
		width: COMPACT_AVATAR,
	},
	picture: StyleSheet.absoluteFill,
	title: { flex: 1, justifyContent: "center" },
});
