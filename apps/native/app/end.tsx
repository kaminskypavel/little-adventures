import {
	BODY_SCROLL_END,
	BODY_SCROLL_START,
} from "@little-adventures/native-ui/body-fade";
import { ForkMap } from "@little-adventures/native-ui/fork-map";
import { FoundPanel } from "@little-adventures/native-ui/found-panel";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	EndMap,
	type MapPlace,
	type MapPlaceNode,
} from "@little-adventures/native-ui/story-map";
import { layout, motion, spacing } from "@little-adventures/native-ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { litRoads } from "@/src/data/fork-roads";
import { END_FADE_AFTER_MS } from "@/src/data/music-rules";
import { useFadeMusicOutAfter } from "@/src/data/music-store";
import { useChildName } from "@/src/data/profile-queries";
import { useReplay } from "@/src/data/replay-store";
import { useAdventure } from "@/src/data/use-adventure";
import { useT } from "@/src/i18n";
import { endStrings } from "@/src/i18n/strings/end";
import { useLandscape } from "@/src/orientation";
import { useScreenFade } from "@/src/screen-fade";

// Round 7 (px / 0.72): the map is 12 px above the panel, which reads 17 pt.
const PANEL_GAP = 17;
// The order the places were found in, and the order of the facts.
const PLACES: readonly MapPlaceNode[] = ["p1", "p2", "p1a", "p2a"];
const WALKED_ALL = ["intro", "p1", "p2", "p1a", "p2a", "outro"] as const;
const NO_ROADS: ReadonlySet<string> = new Set();
const LIT_ROADS = litRoads(WALKED_ALL);

/** 16 The end: the whole map walked, the moon open, and what we found out. */
export default function End() {
	const t = useT(endStrings);
	const router = useRouter();
	const { leave, veil } = useScreenFade();
	const calm = useCalm();
	const { id = "box" } = useLocalSearchParams<{ id?: string }>();
	const { adventure } = useAdventure(id);
	const childName = useChildName() ?? "";
	const sideways = useLandscape();
	useFadeMusicOutAfter(END_FADE_AFTER_MS);
	const goHome = () => leave(() => router.replace("/home"));
	// Here the replay is over: the stored progress shows again.
	useEffect(() => {
		useReplay.getState().clear(id);
	}, [id]);
	const playAgain = () =>
		leave(() => {
			useReplay.getState().start(id);
			router.replace(`/map?id=${id}`);
		});

	// Sideways, the whole road is walked: every place done, the star at the open goodnight.
	if (sideways) {
		if (!(adventure && childName)) {
			return <>{veil}</>;
		}
		const places = Object.fromEntries(
			["intro", ...PLACES].map((node) => [
				node,
				{
					label: true,
					name: adventure.places[node as MapPlaceNode].name,
					picture: adventure.places[node as MapPlaceNode].picture,
					state: "done",
				} satisfies MapPlace,
			])
		) as Record<MapPlaceNode, MapPlace>;
		return (
			<>
				<ForkMap
					button={
						<View style={styles.buttons}>
							<IconButton
								accessibilityLabel={t("playAgain")}
								icon="replay"
								onPress={playAgain}
							/>
							<IconButton
								accessibilityLabel={t("home")}
								icon="home"
								onPress={goHome}
								tone="sun"
							/>
						</View>
					}
					dots={NO_ROADS}
					goodnight={{
						image: adventure.endGoal.open,
						locked: false,
						name: adventure.places.outro.name,
					}}
					here="outro"
					lit={LIT_ROADS}
					places={places}
					route={["outro"]}
					title={t("goodnight")}
				/>
				{veil}
			</>
		);
	}

	return (
		<>
			<Screen
				compactTitle
				dock={
					<View style={styles.buttons}>
						<IconButton
							accessibilityLabel={t("playAgain")}
							icon="replay"
							onPress={playAgain}
						/>
						<IconButton
							accessibilityLabel={t("home")}
							icon="home"
							onPress={goHome}
							tone="sun"
						/>
					</View>
				}
				scrolls
				// A blank line keeps the headline's room while the name loads.
				title={t("goodnight")}
			>
				{adventure && childName ? (
					<Animated.View
						entering={FadeIn.duration(
							calm ? motion.reducedReveal : motion.enter
						).reduceMotion(ReduceMotion.Never)}
						style={{ flex: 1, marginTop: spacing.sm }}
					>
						{/* Bounded by the body, so the panel never runs under the Home button: it scrolls instead. */}
						<ScrollView
							contentContainerStyle={{
								paddingBottom: BODY_SCROLL_END,
								paddingTop: BODY_SCROLL_START,
							}}
							showsVerticalScrollIndicator={false}
						>
							<EndMap goal={adventure.endGoal.open} places={adventure.places} />
							<FoundPanel
								items={PLACES.map((node) => adventure.places[node].fact).filter(
									Boolean
								)}
								style={{ marginTop: PANEL_GAP }}
								title={t("found")}
							/>
						</ScrollView>
					</Animated.View>
				) : null}
			</Screen>
			{veil}
		</>
	);
}

const styles = StyleSheet.create({
	buttons: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		justifyContent: "center",
	},
});
