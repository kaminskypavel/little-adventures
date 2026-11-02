import {
	BODY_SCROLL_END,
	BODY_SCROLL_START,
} from "@little-adventures/native-ui/body-fade";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { FoundPanel } from "@little-adventures/native-ui/found-panel";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	EndMap,
	type MapPlaceNode,
} from "@little-adventures/native-ui/story-map";
import { motion, spacing } from "@little-adventures/native-ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { getProfile } from "@/src/data/adventure-client";
import { useAdventure } from "@/src/data/use-adventure";

// Round 7 (px / 0.72): the map is 12 px above the panel, which reads 17 pt.
const PANEL_GAP = 17;
// The order the places were found in, and the order of the facts.
const PLACES: readonly MapPlaceNode[] = ["p1", "p2", "p1a", "p2a"];

/** 16 The end: the whole map walked, the moon open, and what we found out. */
export default function End() {
	const router = useRouter();
	const calm = useCalm();
	const { id = "box" } = useLocalSearchParams<{ id?: string }>();
	const { adventure } = useAdventure(id);
	const [childName, setChildName] = useState("");

	useEffect(() => {
		let live = true;
		getProfile().then((p) => live && setChildName(p.childName));
		return () => {
			live = false;
		};
	}, []);

	return (
		<Screen
			compactTitle
			dock={
				<PrimaryButton label="Home" onPress={() => router.replace("/home")} />
			}
			scrolls
			// A blank line keeps the headline's room while the name loads.
			title="Goodnight!"
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
						/>
					</ScrollView>
				</Animated.View>
			) : null}
		</Screen>
	);
}
