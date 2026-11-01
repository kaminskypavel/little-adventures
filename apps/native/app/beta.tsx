import { ClayText } from "@little-adventures/native-ui/clay-text";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { signOut } from "@/src/auth/auth-client";

// The same calm layout as the error screen: the star, a headline, one line.
const STAR_SIZE = 200;
const STAR_TOP = 120;
const TITLE_GAP = 40;
const LINE_GAP = 20;
const LINE = { fontSize: 22, lineHeight: 28 } as const;

/** A signed-in grown-up outside the private beta: nothing here costs anything. */
export default function Beta() {
	const router = useRouter();
	const leave = async () => {
		await signOut();
		router.replace("/welcome");
	};

	return (
		<Screen dock={<QuietLink label="Sign out" onPress={leave} />}>
			<View pointerEvents="none" style={styles.star}>
				<StarTake size={STAR_SIZE} take="wave" />
			</View>
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={styles.title}
				variant="headline"
			>
				{"We're in a small\nprivate beta"}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				Little Adventures is open to a few families for now. We will write to
				you when it opens.
			</ClayText>
		</Screen>
	);
}

const styles = StyleSheet.create({
	line: { marginTop: LINE_GAP, paddingHorizontal: spacing.lg },
	star: {
		alignSelf: "center",
		height: STAR_SIZE,
		marginTop: STAR_TOP,
		width: STAR_SIZE,
	},
	title: { marginTop: TITLE_GAP },
});
