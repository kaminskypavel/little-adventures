import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { StoryCover } from "@little-adventures/native-ui/story-cover";
import {
	colors,
	layout,
	storyCover,
} from "@little-adventures/native-ui/tokens";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getHome } from "@/src/data/adventure-client";
import type { AdventureSummary } from "@/src/data/types";

// Mockup 07b (390 x 844 phone, px = pt): the grid starts 18 below the top bar.
const GRID_GAP = 18;
const COLUMNS = 2;
const SKELETON_FADE = 0.15;
const SKELETON_COUNT = 4;

const chunk = <T,>(list: T[], size: number): T[][] => {
	const rows: T[][] = [];
	for (let i = 0; i < list.length; i += size) {
		rows.push(list.slice(i, i + size));
	}
	return rows;
};

export default function Library() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [stories, setStories] = useState<AdventureSummary[] | null>(null);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			// Unfinished stories first, finished ones after.
			getHome()
				.then((home) => {
					if (live) {
						setStories([...home.keepGoing, ...home.finished]);
					}
				})
				.catch(() => live && setStories([]));
			return () => {
				live = false;
			};
		}, [])
	);

	const open = (story: AdventureSummary) =>
		router.push(story.finished ? `/end?id=${story.id}` : `/map?id=${story.id}`);

	return (
		<Screen
			topBar={
				<ClayText
					accessibilityRole="header"
					color={colors.cream}
					numberOfLines={1}
					style={styles.title}
					variant="title"
				>
					Your stories
				</ClayText>
			}
		>
			<ScrollView
				contentContainerStyle={{
					gap: layout.gap,
					paddingBottom: insets.bottom + layout.dockBottom,
					paddingTop: GRID_GAP,
				}}
				showsVerticalScrollIndicator={false}
			>
				{stories === null
					? chunk(
							Array.from({ length: SKELETON_COUNT }, (_, n) => n),
							COLUMNS
						).map((row) => (
							<View key={row.join("-")} style={styles.row}>
								{row.map((n) => (
									<View key={n} style={styles.skeleton} />
								))}
							</View>
						))
					: chunk(stories, COLUMNS).map((row) => (
							<View key={row.map((s) => s.id).join("-")} style={styles.row}>
								{row.map((story) => (
									<StoryCover
										caption={
											story.finished
												? "Finished"
												: `${story.partsDone} of ${story.partsTotal} places`
										}
										done={story.finished}
										key={story.id}
										onPress={() => open(story)}
										picture={story.picture}
										size="grid"
										style={styles.cell}
										title={story.title}
									/>
								))}
								{row.length < COLUMNS ? <View style={styles.cell} /> : null}
							</View>
						))}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	cell: { flex: 1 },
	row: { flexDirection: "row", gap: layout.gap },
	skeleton: {
		backgroundColor: colors.sand,
		borderRadius: storyCover.radius,
		flex: 1,
		height: storyCover.grid.height,
		opacity: SKELETON_FADE,
	},
	title: { flex: 1 },
});
