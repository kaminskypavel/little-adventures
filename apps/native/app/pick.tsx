import { SecondaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { HeroCard } from "@little-adventures/native-ui/hero-card";
import { PictureRow } from "@little-adventures/native-ui/picture-row";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, layout, listCards } from "@little-adventures/native-ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getIdeas } from "@/src/data/adventure-client";
import type { Idea } from "@/src/data/types";

// Round 7 08 at 0.72 scale (px / 0.72), measured from the bottom of the headline.
// The two bottom gaps are tightened so the rows clear the dock, which sits 16 above the safe edge.
const HERO_GAP = 16;
const HERO_HEIGHT = 189;
const LABEL_GAP = 22;
const MSG_GAP = 17;
const ROWS_GAP = layout.gap;
// The star stands on the top edge of the card, right of the label.
const STAR_SIZE = 86;
const STAR_LEFT = 272;
const STAR_UP = 31;

export default function Pick() {
	const router = useRouter();
	const { mic } = useLocalSearchParams<{ mic?: string }>();
	const micOff = mic === "off";
	const [ideas, setIdeas] = useState<Idea[] | null>(null);

	const load = useCallback(() => {
		setIdeas(null);
		getIdeas().then(setIdeas);
	}, []);
	useEffect(() => {
		load();
	}, [load]);

	return (
		<Screen
			dock={
				micOff ? undefined : (
					<SecondaryButton label="Other ideas" onPress={load} />
				)
			}
			title="What shall we explore?"
		>
			<View style={{ marginTop: HERO_GAP }}>
				{micOff ? (
					<HeroCard height={HERO_HEIGHT} label={"Mic is\noff"} off />
				) : (
					<HeroCard
						height={HERO_HEIGHT}
						label={"Ask\nyour own"}
						onPress={() => router.push("/listening")}
					/>
				)}
				{micOff ? null : (
					<View pointerEvents="none" style={styles.star}>
						<StarTake size={STAR_SIZE} take="idle" />
					</View>
				)}
			</View>
			{micOff ? (
				<ClayText
					align="center"
					color={colors.cream}
					style={styles.msg}
					variant="label"
				>
					Ask a grown-up to turn it on.
				</ClayText>
			) : (
				<ClayText
					align="center"
					color={colors.cream}
					style={styles.label}
					variant="label"
				>
					or pick an idea
				</ClayText>
			)}
			<View style={styles.rows}>
				{ideas ? (
					ideas.map((idea) => (
						<PictureRow
							key={idea.question}
							onPress={() =>
								router.push({
									params: { question: idea.question },
									pathname: "/making",
								})
							}
							picture={idea.picture}
							title={idea.question}
						/>
					))
				) : (
					<>
						<View style={styles.skeleton} />
						<View style={styles.skeleton} />
					</>
				)}
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	label: { marginTop: LABEL_GAP },
	msg: { fontSize: 22, lineHeight: 28, marginTop: MSG_GAP },
	rows: { gap: ROWS_GAP, marginTop: ROWS_GAP },
	skeleton: {
		backgroundColor: colors.sand,
		borderRadius: listCards.pictureRow.radius,
		height: listCards.pictureRow.height,
		opacity: 0.15,
	},
	star: {
		height: STAR_SIZE,
		left: STAR_LEFT - layout.sideMargin,
		position: "absolute",
		top: -STAR_UP,
		width: STAR_SIZE,
	},
});
