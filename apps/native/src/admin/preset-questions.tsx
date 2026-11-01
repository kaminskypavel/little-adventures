import { SecondaryButton } from "@little-adventures/native-ui/button";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { loaderFacts } from "@/src/data/adventure-client";
import { setSpokenFacts, setSpokenQuestion } from "@/src/data/spoken-question";
import { useAdminPanel } from "./admin-panel-store";

/** Ready-made questions so an admin can test the flow without recording. */
export const PRESET_QUESTIONS = [
	"Why do dogs bark?",
	"How do bees make honey?",
	"Why is the sky blue?",
	"Where do rainbows come from?",
	"Where do cats come from?",
] as const;

/** Admin tool on Listening: a tap goes on as if the child had just asked it. */
export function PresetQuestions() {
	const router = useRouter();
	const ask = (question: string) => {
		setSpokenQuestion(question, question);
		loaderFacts(question).then((facts) => setSpokenFacts(question, facts));
		useAdminPanel.getState().setOpen(false);
		router.replace("/verify");
	};
	return (
		<View style={styles.list}>
			{PRESET_QUESTIONS.map((question) => (
				<SecondaryButton
					key={question}
					label={question}
					onPress={() => ask(question)}
					size="sm"
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	list: { gap: 8 },
});
