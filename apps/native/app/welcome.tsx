import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Logo } from "@little-adventures/native-ui/logo";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, layout } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Round 7 01 at 0.72 scale: star 200 px wide at top 92 px, logo at 296 px, tagline at 396 px.
const STAR = 278;
const LOGO_GAP = 5;
const TAGLINE_GAP = 11;
const TAGLINE_INSET = 25;
const TAGLINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;

export default function Welcome() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const next = () => router.push("/account");

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<PrimaryButton label="Get started" onPress={next} />}
		>
			<View style={[styles.account, { top: insets.top + layout.topBarOffset }]}>
				<QuietLink label="I have an account" onPress={next} />
			</View>
			<View style={styles.star}>
				<StarTake size={STAR} take="wave" />
			</View>
			<View style={styles.logo}>
				<Logo />
			</View>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.tagline, TAGLINE]}
				variant="body"
			>
				Stories that start with your child's curiosity
			</ClayText>
		</Screen>
	);
}

const styles = StyleSheet.create({
	account: { position: "absolute", right: layout.sideMargin },
	body: { alignItems: "center", paddingTop: 128 },
	logo: { marginTop: LOGO_GAP },
	star: { height: STAR, width: STAR },
	tagline: { marginTop: TAGLINE_GAP, paddingHorizontal: TAGLINE_INSET },
});
