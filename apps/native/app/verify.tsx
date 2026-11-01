import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { Screen } from "@little-adventures/native-ui/screen";
import { SpeakingCue } from "@little-adventures/native-ui/speaking-cue";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, flat, fonts } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shortQuestion } from "@/src/data/adventure-client";
import { getSpokenQuestion } from "@/src/data/spoken-question";

// Round 7 09b at 0.72 scale (px / 0.72). The star and the speaking cue are one group, centered.
const STAR_SIZE = 128;
const STAR_TOP = 30; // under the two-line headline
const CUE_GAP = 19;
const CUE_TOP = 39; // from the top of the star
const CARD_GAP = 70; // from the bottom of the star

const card = flat.questionCard;
// Four lines at this size plus the card padding fit in the card's own height, so the card is the
// same size while the short question loads and after it, and never grows under the buttons.
const CARD_TEXT = 34;
const CARD_LINES = 4;

/** 09b Did I hear you right?: the question read back, short, then yes or say it again. */
export default function Verify() {
	const router = useRouter();
	// The full words stay in memory, never in the address. The card shows a short version.
	const [question] = useState(getSpokenQuestion);
	const [short, setShort] = useState<string | null>(null);

	useEffect(() => {
		if (!question) {
			// Opened without a recording (a reload on the web): nothing to check.
			router.replace("/listening");
			return;
		}
		let live = true;
		shortQuestion(question).then((text) => {
			if (live) {
				setShort(text);
			}
		});
		return () => {
			live = false;
		};
	}, [question, router]);

	return (
		<Screen
			dock={
				<>
					<PrimaryButton
						label="Yes, let's go!"
						// The adventure starts from the full transcript, not the short one.
						onPress={() => router.replace("/making")}
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
				<SpeakingCue style={styles.cue} />
			</View>
			<View style={styles.card}>
				<Text
					adjustsFontSizeToFit
					minimumFontScale={0.6}
					numberOfLines={CARD_LINES}
					style={[styles.text, short === null && styles.waiting]}
				>
					{short ?? "Thinking..."}
				</Text>
			</View>
		</Screen>
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
	cue: { marginLeft: CUE_GAP, marginTop: CUE_TOP },
	reader: {
		alignItems: "flex-start",
		alignSelf: "center",
		flexDirection: "row",
		height: STAR_SIZE,
		marginTop: STAR_TOP,
	},
	text: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: CARD_TEXT,
		lineHeight: CARD_TEXT * card.lineHeight,
		textAlign: "center",
	},
	waiting: { opacity: 0.55 },
});
