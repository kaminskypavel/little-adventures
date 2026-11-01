import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Character } from "./character";
import { ClayText } from "./clay-text";
import { IconButton } from "./icon-button";
import type { IconName } from "./icons";
import { StarTake, type StarTakeName } from "./star-take";
import { colors, radii } from "./tokens";

const AVATAR = 61;
const AVATAR_STAR = 51;

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
	/** Makes the avatar star live: it plays this gesture when it appears, then rests on idle. */
	take?: StarTakeName;
	/** Change it to play `take` again. */
	takeRun?: number;
	title: string;
}) {
	// The failed url is remembered, so a new url is tried again.
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const picture = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;
	let art: ReactNode = <Character kind="star" size={AVATAR_STAR} />;
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
		art = <StarTake key={takeRun} size={AVATAR_STAR} take={take} />;
	}
	return (
		<>
			{avatar ? <View style={styles.avatar}>{art}</View> : null}
			<ClayText
				accessibilityRole="header"
				color={colors.cream}
				numberOfLines={1}
				style={styles.title}
				variant="title"
			>
				{title}
			</ClayText>
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
	picture: StyleSheet.absoluteFill,
	title: { flex: 1 },
});
