import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ChoiceCard } from "@little-adventures/native-ui/choice-card";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Plate } from "@little-adventures/native-ui/plate";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import {
	colors,
	layout,
	listCards,
	motion,
	spacing,
} from "@little-adventures/native-ui/tokens";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getProfile, getProgress } from "@/src/data/adventure-client";
import { choicesFrom, missingPlaces } from "@/src/data/map-rules";
import type { Adventure, NodeId, Picture, Progress } from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";

const { choice } = listCards;

// How long the picked card shows its ring before the map takes over.
const SELECT_MS = 250;
// Round 7 puts the cards 150 pt from the top, 28 pt under the one-line headline.
const CARDS_BELOW_TITLE = 28;
// The small star at the bottom center, 19 pt above the screen edge, as in round 7.
const STAR_SIZE = 78;
const STAR_BOTTOM = 19;
// Round 7 message lines: 800 at 21 pt.
const LINE = { fontSize: 21, lineHeight: 26 } as const;
const WAITING_LINE = "Still being drawn. One moment.";

interface Card {
	goal: boolean;
	name: string;
	node: NodeId;
	picture: Picture | null;
	state: "drawing" | "locked" | "open";
}

/** The cards to choose from at `from`: a locked or still-drawing place shows as such. */
function cardsOf(
	adventure: Adventure,
	from: NodeId,
	visited: NodeId[],
	lock: boolean | undefined,
	devDrawing: string | undefined
): Card[] {
	return choicesFrom(from, visited).map(({ locked: ruled, node }) => {
		const place = adventure.places[node];
		const goal = node === "outro";
		const locked = goal && lock !== undefined ? lock : ruled;
		let { picture } = place;
		if (goal) {
			picture = locked ? adventure.endGoal.closed : adventure.endGoal.open;
		}
		let state: Card["state"] = "open";
		if (locked) {
			state = "locked";
		} else if (node === devDrawing || place.status === "drawing") {
			state = "drawing";
		}
		return { goal, name: place.name, node, picture, state };
	});
}

/** The star waits and thinks while nothing can be chosen, steps aside for a peek, else points. */
function starTakeFor({
	drawing,
	goodnightOpen,
	waiting,
}: {
	drawing: boolean;
	goodnightOpen: boolean;
	waiting: boolean;
}): "jump" | "point" | "think" | null {
	if (waiting) {
		return "think";
	}
	if (drawing) {
		return null;
	}
	return goodnightOpen ? "jump" : "point";
}

/** The small star. No still under it: the take's arm would leave a ghost; the screen fade covers the load. */
function Star({ take }: { take: "jump" | "point" | "think" }) {
	return (
		<View pointerEvents="none" style={styles.starRow}>
			<StarTake size={STAR_SIZE} take={take} />
		</View>
	);
}

/** 13 Choice, 13b goodnight locked, 14 goodnight open, E2 place still drawing. */
export default function Choice() {
	const router = useRouter();
	const params = useLocalSearchParams<{
		drawing?: string;
		from?: string;
		id?: string;
		visited?: string;
	}>();
	const id = params.id ?? "box";
	const from = (params.from ?? "intro") as NodeId;
	const { adventure } = useAdventure(id);
	const [progress, setProgress] = useState<Progress | null>(null);
	const [childName, setChildName] = useState<string | null>(null);
	const [picked, setPicked] = useState<NodeId | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		let live = true;
		getProgress(id).then((p) => live && setProgress(p));
		getProfile().then((p) => live && setChildName(p.childName));
		return () => {
			live = false;
			clearTimeout(timer.current);
		};
	}, [id]);

	// Dev only: ?visited=p1,p2 pretends those places were watched, ?drawing=p1a marks one as not drawn yet.
	const devVisited = dev(params.visited);
	const devDrawing = dev(params.drawing);
	const visited = devVisited
		? (devVisited.split(",") as NodeId[])
		: progress?.visited;
	const engineOutroLock = devVisited ? undefined : progress?.outroLocked;
	const cards =
		adventure && visited
			? cardsOf(adventure, from, visited, engineOutroLock, devDrawing)
			: [];

	const goodnight = cards.find((c) => c.goal);
	const goodnightLocked = goodnight?.state === "locked";
	const goodnightOpen = goodnight?.state === "open";
	const drawing = cards.some((c) => c.state === "drawing");
	const other = cards.find((c) => c.state === "open");
	const waiting = drawing && !other;

	useEffect(() => {
		if (goodnightOpen) {
			notificationAsync(NotificationFeedbackType.Success);
		}
	}, [goodnightOpen]);

	if (!(adventure && visited) || childName === null) {
		return null;
	}

	const walkTo = (node: NodeId) =>
		router.replace(`/map?id=${id}&walkTo=${node}`);
	const pick = (node: NodeId) => {
		if (picked) {
			return;
		}
		setPicked(node);
		timer.current = setTimeout(() => walkTo(node), SELECT_MS);
	};
	const peek = drawing ? other : undefined;
	const starTake = starTakeFor({ drawing, goodnightOpen, waiting });
	const missing = missingPlaces(visited);

	return (
		<Screen
			bodyStyle={{ paddingTop: goodnightOpen ? spacing.sm : CARDS_BELOW_TITLE }}
			dock={
				peek ? (
					<PrimaryButton
						label={`Peek at ${peek.name}`}
						onPress={() => walkTo(peek.node)}
					/>
				) : undefined
			}
			title={`Which way, ${childName}?`}
		>
			{goodnightOpen ? (
				<ClayText
					align="center"
					color={colors.cream}
					style={[LINE, styles.done]}
					variant="label"
				>
					All 4 places done!
				</ClayText>
			) : null}
			<View style={styles.cards}>
				{cards.map((card, index) => (
					<ChoiceCard
						key={card.node}
						kind={card.goal ? "goal" : "place"}
						name={card.name}
						onPress={
							card.state === "drawing" ? undefined : () => pick(card.node)
						}
						picture={card.picture}
						pulseDelay={
							card.state === "drawing" ? null : index * motion.pulseOffset
						}
						selected={picked === card.node}
						state={card.state}
						style={
							goodnightLocked || drawing
								? { height: choice.heightTight }
								: undefined
						}
					/>
				))}
			</View>
			{goodnightLocked ? (
				<Plate
					icon="lock"
					label={`${missing} more ${missing > 1 ? "places" : "place"} first`}
					style={styles.plate}
					variant="big"
				/>
			) : null}
			{peek ? (
				<ClayText
					align="center"
					color={colors.cream}
					style={[LINE, styles.message]}
					variant="label"
				>
					{`That one is almost ready. Peek at ${peek.name} first?`}
				</ClayText>
			) : null}
			{waiting ? (
				<ClayText
					align="center"
					color={colors.cream}
					style={[LINE, styles.message]}
					variant="label"
				>
					{WAITING_LINE}
				</ClayText>
			) : null}
			{starTake ? <Star take={starTake} /> : null}
		</Screen>
	);
}

const styles = StyleSheet.create({
	cards: { gap: layout.gap },
	done: { marginBottom: layout.gap },
	message: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
	plate: { alignSelf: "center", marginTop: layout.gap },
	starRow: {
		alignItems: "center",
		bottom: STAR_BOTTOM,
		left: 0,
		position: "absolute",
		right: 0,
	},
});
