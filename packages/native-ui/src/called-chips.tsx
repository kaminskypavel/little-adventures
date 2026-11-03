import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chip } from "./chip";
import { ClayText } from "./clay-text";
import { TextField } from "./text-field";
import { colors, layout, spacing } from "./tokens";

export type Pronoun = "he" | "she";
export type Relation =
	| "mother"
	| "father"
	| "grandmother"
	| "grandfather"
	| "other";

/** What the child calls a grown-up, and who that is in the story. */
export interface Called {
	name: string;
	pronoun: Pronoun;
	relation: Relation;
}

export const PRESETS: Called[] = [
	{ name: "Mama", pronoun: "she", relation: "mother" },
	{ name: "Papa", pronoun: "he", relation: "father" },
	{ name: "Grandma", pronoun: "she", relation: "grandmother" },
	{ name: "Grandpa", pronoun: "he", relation: "grandfather" },
];
const PRONOUNS: Pronoun[] = ["he", "she"];

/** The words on the chips; the app passes them in its language, these are the English. */
export interface CalledLabels {
	/** The hint on the word field. */
	example: string;
	/** Under the chips: `{word}` is what the grown-up typed. */
	inStory: string;
	other: string;
	placeholder: string;
	presets: Record<Exclude<Relation, "other">, string>;
	pronouns: Record<Pronoun, string>;
	/** What stands in for `{word}` before anything is typed. */
	thisGrownUp: string;
}
export const CALLED_LABELS: CalledLabels = {
	example: "Abba, Uncle Tom, Dana",
	inStory: "In the story, {word} is",
	other: "Other",
	placeholder: "Abba",
	presets: {
		father: "Papa",
		grandfather: "Grandpa",
		grandmother: "Grandma",
		mother: "Mama",
	},
	pronouns: { he: "he", she: "she" },
	thisGrownUp: "this grown-up",
};
const MAX_WORD = 30;

/**
 * "What does the child call you?": Mama, Papa, Grandma, Grandpa, or Other (a word of their own
 * plus he / she). A chip answers at once; Other answers when the field loses focus or he / she
 * is tapped. `value` is the saved answer, so the chips start on it.
 */
export function CalledChips({
	labels = CALLED_LABELS,
	onChange,
	value,
}: {
	labels?: CalledLabels;
	onChange: (called: Called) => void;
	value: Called | null;
}) {
	// A preset is told by who it is, so the chip stays lit when the language changes.
	const preset = PRESETS.find(
		(p) => p.relation === value?.relation && value.relation !== "other"
	);
	const [asking, setAsking] = useState(false);
	const [word, setWord] = useState(value && !preset ? value.name : "");
	const [pronoun, setPronoun] = useState<Pronoun>(value?.pronoun ?? "he");
	const other = asking || (value !== null && !preset);

	const saveOther = (text: string, who: Pronoun) => {
		const name = text.trim();
		const same =
			value?.relation === "other" &&
			value.name === name &&
			value.pronoun === who;
		if (name && !same) {
			onChange({ name, pronoun: who, relation: "other" });
		}
	};
	const choose = (called: Called) => {
		setAsking(false);
		onChange(called);
	};
	const chip = (called: Called) => {
		const name =
			labels.presets[called.relation as keyof CalledLabels["presets"]];
		return (
			<Chip
				key={called.relation}
				label={name}
				onPress={() => choose({ ...called, name })}
				selected={!other && preset?.relation === called.relation}
				size="label"
				style={styles.flex}
			/>
		);
	};

	return (
		<View>
			<View style={styles.row}>{PRESETS.slice(0, 2).map(chip)}</View>
			<View style={[styles.row, styles.next]}>
				{PRESETS.slice(2).map(chip)}
				<Chip
					label={labels.other}
					onPress={() => setAsking(true)}
					selected={other}
					size="label"
					style={styles.flex}
				/>
			</View>
			{other ? (
				<>
					<TextField
						autoCapitalize="words"
						label={labels.example}
						maxLength={MAX_WORD}
						onBlur={() => saveOther(word, pronoun)}
						onChangeText={setWord}
						placeholder={labels.placeholder}
						returnKeyType="done"
						style={styles.next}
						value={word}
					/>
					<ClayText color={colors.cream} style={styles.next} variant="label">
						{labels.inStory.replace(
							"{word}",
							word.trim() || labels.thisGrownUp
						)}
					</ClayText>
					<View style={[styles.row, styles.tight]}>
						{PRONOUNS.map((who) => (
							<Chip
								key={who}
								label={labels.pronouns[who]}
								onPress={() => {
									setPronoun(who);
									saveOther(word, who);
								}}
								selected={pronoun === who}
								size="label"
								style={styles.flex}
							/>
						))}
					</View>
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	next: { marginTop: spacing.md },
	row: { flexDirection: "row", gap: layout.gapTight },
	tight: { marginTop: layout.gapTight },
});
