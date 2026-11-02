import { PrimaryButton } from "@little-adventures/native-ui/button";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, flat, fonts } from "@little-adventures/native-ui/tokens";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
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

	// Only while this screen is on top: it stays mounted under the style and making screens,
	// and the question is cleared once the adventure starts.
	useFocusEffect(
		useCallback(() => {
			if (hydrated && !short) {
				// Nothing was asked yet (or it was already started): ask again.
				router.replace("/listening");
			}
		}, [hydrated, short, router])
	);

	return (
		<View style={styles.root}>
			<Screen
				dock={
					<PrimaryButton
						label="Yes, let's go!"
						// The adventure starts from the full transcript, not the short one.
						onPress={() => router.push("/style")}
					/>
				}
				title={"Did I hear\nyou right?"}
			>
				<View style={styles.reader}>
					<StarTake size={STAR_SIZE} take="idle" />
				</View>
				<View style={styles.cardWrap}>
					<View style={styles.card}>
						<Text
							adjustsFontSizeToFit
							allowFontScaling={false}
							minimumFontScale={0.6}
							numberOfLines={CARD_LINES}
							style={styles.text}
						>
							{short}
						</Text>
					</View>
					<IconButton
						accessibilityLabel="Say it again"
						icon="mic"
						// 09a replaced itself with this screen, so back would land on the pick screen.
						onPress={() => router.replace("/listening")}
						style={styles.badge}
					/>
				</View>
			</Screen>
		</View>
	);
}

// The 64 pt mic badge sits on the card's bottom right corner (Round 1 C: 4 pt in from the right
// edge, 18 pt below the bottom).
const BADGE_RIGHT = 4;
const BADGE_BELOW = 18;

const styles = StyleSheet.create({
	badge: { bottom: -BADGE_BELOW, position: "absolute", right: BADGE_RIGHT },
	card: {
		alignItems: "center",
		alignSelf: "stretch",
		backgroundColor: colors.sand,
		borderRadius: card.radius,
		flexShrink: 1,
		height: card.minHeight,
		justifyContent: "center",
		overflow: "hidden",
		paddingHorizontal: card.padX,
		paddingVertical: card.padY,
	},
	cardWrap: { alignSelf: "stretch", flexShrink: 1, marginTop: CARD_GAP },
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
