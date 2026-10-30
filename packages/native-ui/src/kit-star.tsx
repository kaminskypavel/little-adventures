import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Character } from "./character";
import { type StarTakeName, starTakeNames } from "./star-source-files";
import { StarTake } from "./star-take";
import { colors, layout, radii, spacing, type } from "./tokens";

const STAR_SIZE = 200;
const CHARACTER_SIZE = 130;

// Dev-only gallery block: the animated star with a button per take, and the still characters.
export function KitStar() {
	const [take, setTake] = useState<StarTakeName>("idle");

	return (
		<View style={styles.block}>
			<Text style={styles.label}>Star takes</Text>
			<View style={styles.stage}>
				<StarTake
					onTakeEnd={(ended) =>
						setTake((now) => (now === ended ? "idle" : now))
					}
					size={STAR_SIZE}
					take={take}
				/>
			</View>
			<View style={styles.buttons}>
				{starTakeNames.map((name) => (
					<Pressable
						accessibilityLabel={`Play ${name}`}
						accessibilityRole="button"
						key={name}
						onPress={() => setTake(name)}
						style={[styles.button, take === name && styles.buttonOn]}
					>
						<Text
							style={[styles.buttonText, take === name && styles.buttonTextOn]}
						>
							{name}
						</Text>
					</Pressable>
				))}
			</View>
			<Text style={styles.label}>Characters</Text>
			<View style={styles.characters}>
				<Character kind="star" size={CHARACTER_SIZE} />
				<Character hop kind="puppy" size={CHARACTER_SIZE} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	block: { gap: layout.gap },
	button: {
		backgroundColor: colors.deepNavy,
		borderRadius: radii.chip,
		justifyContent: "center",
		minHeight: layout.minTarget,
		paddingHorizontal: spacing.lg,
	},
	buttonOn: { backgroundColor: colors.sun },
	buttons: { flexDirection: "row", flexWrap: "wrap", gap: layout.gapTight },
	buttonText: { ...type.label, color: colors.cream },
	buttonTextOn: { color: colors.inkNavy },
	characters: {
		alignItems: "center",
		flexDirection: "row",
		gap: spacing.xl,
		paddingBottom: spacing.lg,
	},
	label: { ...type.label, color: colors.cream },
	stage: { alignItems: "center", height: STAR_SIZE + spacing.lg },
});
