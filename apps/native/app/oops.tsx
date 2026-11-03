import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useT } from "@/src/i18n";
import { oopsStrings } from "@/src/i18n/strings/oops";

// Round 7 (0.72 scale to points): star 236 wide, 153 from the top, tilted 9 degrees to the left,
// the headline 55 under it and the line 25 under the headline.
const STAR_SIZE = 236;
const STAR_TOP = 153;
const STAR_TILT = "-9deg";
const TITLE_GAP = 55;
const LINE_GAP = 25;
const LINE = { fontSize: 24, lineHeight: 30 } as const;

/** E3 Something broke: calm copy, one action. */
export default function Oops() {
	const router = useRouter();
	const t = useT(oopsStrings);

	return (
		<Screen
			dock={
				<PrimaryButton
					label={t("tryAgain")}
					onPress={() =>
						router.canGoBack() ? router.back() : router.replace("/home")
					}
				/>
			}
		>
			<View pointerEvents="none" style={styles.star}>
				<StarTake size={STAR_SIZE} take="think" />
			</View>
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={styles.title}
				variant="headline"
			>
				{t("title")}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				{t("line")}
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
		transform: [{ rotate: STAR_TILT }],
		width: STAR_SIZE,
	},
	title: { marginTop: TITLE_GAP },
});
