import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { QuestionCard } from "@little-adventures/native-ui/question-card";
import { Screen } from "@little-adventures/native-ui/screen";
import { SpeakingCue } from "@little-adventures/native-ui/speaking-cue";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

// Round 7 09b at 0.72 scale (px / 0.72). The star and the speaking cue are one group, centered.
const STAR_SIZE = 128;
const STAR_TOP = 30; // under the two-line headline
const CUE_GAP = 19;
const CUE_TOP = 39; // from the top of the star
const CARD_GAP = 70; // from the bottom of the star

/** 09b Did I hear you right?: the question read back by the star, then yes or say it again. */
export default function Verify() {
	const router = useRouter();
	const { question = "" } = useLocalSearchParams<{ question?: string }>();

	return (
		<Screen
			dock={
				<>
					<PrimaryButton
						label="Yes, let's go!"
						onPress={() =>
							router.replace({ params: { question }, pathname: "/making" })
						}
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
			<QuestionCard style={styles.card} text={question} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	card: { marginTop: CARD_GAP },
	cue: { marginLeft: CUE_GAP, marginTop: CUE_TOP },
	reader: {
		alignItems: "flex-start",
		alignSelf: "center",
		flexDirection: "row",
		height: STAR_SIZE,
		marginTop: STAR_TOP,
	},
});
