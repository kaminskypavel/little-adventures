import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Character } from "./character";
import { ClayText } from "./clay-text";
import { IconButton } from "./icon-button";
import type { IconName } from "./icons";
import { Skeleton } from "./skeleton";
import { StarTake, type StarTakeName } from "./star-take";
import { TitleHold } from "./title-hold";
import { colors, layout, radii, type as typeScale } from "./tokens";

const AVATAR = 61;
const AVATAR_STAR = 51;
// Compact (Home): a 56 pt avatar in a faint cream ring, and no title.
const COMPACT_AVATAR = 56;
const COMPACT_STAR = 47;
// Grows the 56 pt avatar to a 64 pt target.
const AVATAR_SLOP = 4;
const RING = "0px 0px 0px 3px rgba(244,236,216,0.28)";
const TITLE_BAR_WIDTH = 170;
const TITLE_BAR_RATIO = 0.8;

/** The title: none when compact, a skeleton bar while the name loads, else the held headline. */
function Title({
	compact,
	onTitleLongPress,
	title,
}: {
	compact: boolean;
	onTitleLongPress?: () => void;
	title?: string | null;
}) {
	if (compact) {
		return <View style={styles.title} />;
	}
	if (title === null) {
		return (
			<View style={styles.titleSlot}>
				<Skeleton style={styles.titleBar} />
			</View>
		);
	}
	return (
		<TitleHold onTitleLongPress={onTitleLongPress} style={styles.title}>
			<ClayText
				accessibilityRole="header"
				adjustsFontSizeToFit
				align="center"
				color={colors.cream}
				minimumFontScale={0.8}
				numberOfLines={1}
				variant="title"
			>
				{title}
			</ClayText>
		</TitleHold>
	);
}

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
	end,
	avatarImage,
	compact = false,
	onAvatarPress,
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
	/** A control of the screen's own at the right, in place of the icon button (Grown-ups: Sign out). */
	end?: ReactNode;
	/** The child's drawn picture. Shown instead of the star; the star stays when it is missing or fails to load. */
	/** The child's drawing. Its cacheKey (the storage key) keeps it from reloading as the signed url changes. */
	avatarImage?: { cacheKey?: string; uri: string } | null;
	/** A 56 pt avatar with a cream ring, and no title: the lock stays at the right. */
	compact?: boolean;
	/** Makes the avatar a button (Home: opens "Who's listening?"). Plain picture when absent. */
	onAvatarPress?: () => void;
	/** A 1 s hold on the title. Defaults to the app's `TitleHoldProvider` action. */
	onTitleLongPress?: () => void;
	/** Makes the avatar star live: it plays this gesture when it appears, then rests on idle. */
	take?: StarTakeName;
	/** Change it to play `take` again. */
	takeRun?: number;
	/** Null while the name loads: a bar the size of the title line stands in. Not shown when compact. */
	title?: string | null;
}) {
	// The failed url is remembered, so a new url is tried again.
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const starSize = compact ? COMPACT_STAR : AVATAR_STAR;
	const picture =
		avatarImage && avatarImage.uri !== failedUrl ? avatarImage : null;
	let art: ReactNode = <Character kind="star" size={starSize} />;
	if (picture) {
		art = (
			<Image
				accessibilityIgnoresInvertColors
				cachePolicy="memory-disk"
				contentFit="cover"
				onError={() => setFailedUrl(picture.uri)}
				source={picture}
				style={styles.picture}
			/>
		);
	} else if (take) {
		art = <StarTake key={takeRun} size={starSize} take={take} />;
	}
	const face = (
		<View style={compact ? styles.compact : styles.avatar}>{art}</View>
	);
	return (
		<>
			{avatar && onAvatarPress ? (
				<Pressable
					accessibilityLabel="Who's listening?"
					accessibilityRole="button"
					hitSlop={AVATAR_SLOP}
					onPress={onAvatarPress}
				>
					{face}
				</Pressable>
			) : null}
			{avatar && !onAvatarPress ? face : null}
			<Title
				compact={compact}
				onTitleLongPress={onTitleLongPress}
				title={title}
			/>
			{end ?? null}
			{!end && action ? (
				<IconButton
					accessibilityLabel={action.accessibilityLabel}
					icon={action.icon}
					onPress={action.onPress}
				/>
			) : null}
			{end || action ? null : (
				// Balances the back button, so the title stays centred on the screen.
				<View style={styles.spacer} />
			)}
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
	spacer: { width: layout.minTarget },
	title: { flex: 1, justifyContent: "center" },
	titleBar: {
		borderRadius: radii.full,
		height: typeScale.title.fontSize * TITLE_BAR_RATIO,
		width: TITLE_BAR_WIDTH,
	},
	titleSlot: {
		alignItems: "center",
		flex: 1,
		height: typeScale.title.lineHeight,
		justifyContent: "center",
	},
});
