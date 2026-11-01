import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, flat, fonts } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
	useSpokenHydrated,
	useSpokenQuestion,
} from "@/src/data/spoken-question";

// Round 7 09b at 0.72 scale (px / 0.72). The star is centered.
const STAR_SIZE = 128;
const STAR_TOP = 30; // under the two-line headline
const CARD_GAP = 70; // from the bottom of the star

const card = flat.questionCard;
// Four lines at this size plus the card padding fit in the card's own height, so the card never
// grows under the buttons.
const CARD_TEXT = 34;
const CARD_LINES = 4;

/** 09b Did I hear you right?: the question read back, short, then yes or say it again. */
export default function Verify() {
	const router = useRouter();
	// The words stay in memory, never in the address. Listening opens this screen only once the
	// short version is back, so the card has its words at once.
	const short = useSpokenQuestion((spoken) => spoken.short);
	const hydrated = useSpokenHydrated();

	useEffect(() => {
		if (hydrated && !short) {
			// Nothing was asked yet (or it was already started): ask again.
			router.replace("/listening");
		}
	}, [hydrated, short, router]);

	return (
		<View style={styles.root}>
			<Screen
				dock={
					<>
						<PrimaryButton
							label="Yes, let's go!"
							// The adventure starts from the full transcript, not the short one.
							onPress={() => router.push("/style")}
						/>
						<SecondaryButton
							label="Say it again"
							// 09a replaced itself with this screen, so back would land on the pick screen.
							onPress={() => router.replace("/listening")}
						/>
					</>
				}
				title={"Did I hear\nyou right?"}
			>
				<View style={styles.reader}>
					<StarTake size={STAR_SIZE} take="idle" />
				</View>
				<View style={styles.card}>
					<Text
						adjustsFontSizeToFit
						minimumFontScale={0.6}
						numberOfLines={CARD_LINES}
						style={styles.text}
					>
						{short}
					</Text>
				</View>
			</Screen>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		alignItems: "center",
		alignSelf: "stretch",
		backgroundColor: colors.sand,
		borderRadius: card.radius,
		flexShrink: 1,
		height: card.minHeight,
		justifyContent: "center",
		marginTop: CARD_GAP,
		overflow: "hidden",
		paddingHorizontal: card.padX,
		paddingVertical: card.padY,
	},
	reader: {
		alignItems: "flex-start",
		alignSelf: "center",
		flexDirection: "row",
		height: STAR_SIZE,
		marginTop: STAR_TOP,
	},
	root: { flex: 1 },
	text: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: CARD_TEXT,
		lineHeight: CARD_TEXT * card.lineHeight,
		textAlign: "center",
	},
});
