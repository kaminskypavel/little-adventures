import { StyleSheet, View } from "react-native";
import { Character } from "./character";
import { ClayText } from "./clay-text";
import { IconButton } from "./icon-button";
import type { IconName } from "./icons";
import { colors, radii } from "./tokens";

const AVATAR = 61;
const AVATAR_STAR = 51;

/**
 * Top bar row for Home, the map and Grown-ups: optional star avatar, a title,
 * and one icon button at the right (lock to Grown-ups, or close).
 * Place it in `Screen`'s `topBar` slot.
 */
export function TopBar({
	action,
	avatar = false,
	title,
}: {
	action?: {
		accessibilityLabel: string;
		icon: IconName;
		onPress: () => void;
	};
	avatar?: boolean;
	title: string;
}) {
	return (
		<>
			{avatar ? (
				<View style={styles.avatar}>
					<Character kind="star" size={AVATAR_STAR} />
				</View>
			) : null}
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
	title: { flex: 1 },
});
