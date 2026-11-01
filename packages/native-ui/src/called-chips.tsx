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

const PRESETS: Called[] = [
	{ name: "Mama", pronoun: "she", relation: "mother" },
	{ name: "Papa", pronoun: "he", relation: "father" },
	{ name: "Grandma", pronoun: "she", relation: "grandmother" },
	{ name: "Grandpa", pronoun: "he", relation: "grandfather" },
];
const PRONOUNS: Pronoun[] = ["he", "she"];
const MAX_WORD = 30;

/**
 * "What does the child call you?": Mama, Papa, Grandma, Grandpa, or Other (a word of their own
 * plus he / she). A chip answers at once; Other answers when the field loses focus or he / she
 * is tapped. `value` is the saved answer, so the chips start on it.
 */
export function CalledChips({
	onChange,
	value,
}: {
	onChange: (called: Called) => void;
	value: Called | null;
}) {
	const preset = PRESETS.find(
		(p) => p.name === value?.name && p.relation === value.relation
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
	const chip = (called: Called) => (
		<Chip
			key={called.name}
			label={called.name}
			onPress={() => choose(called)}
			selected={!other && preset?.name === called.name}
			size="label"
			style={styles.flex}
		/>
	);

	return (
		<View>
			<View style={styles.row}>{PRESETS.slice(0, 2).map(chip)}</View>
			<View style={[styles.row, styles.next]}>
				{PRESETS.slice(2).map(chip)}
				<Chip
					label="Other"
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
						label="Abba, Uncle Tom, Dana"
						maxLength={MAX_WORD}
						onBlur={() => saveOther(word, pronoun)}
						onChangeText={setWord}
						placeholder="Abba"
						returnKeyType="done"
						style={styles.next}
						value={word}
					/>
					<ClayText color={colors.cream} style={styles.next} variant="label">
						{`In the story, ${word.trim() || "this grown-up"} is`}
					</ClayText>
					<View style={[styles.row, styles.tight]}>
						{PRONOUNS.map((who) => (
							<Chip
								key={who}
								label={who}
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
