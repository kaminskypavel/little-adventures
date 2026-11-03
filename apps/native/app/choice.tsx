import {
	BackButton,
	useBackAction,
} from "@little-adventures/native-ui/back-button";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ChoiceCard } from "@little-adventures/native-ui/choice-card";
import { ChoiceHalf } from "@little-adventures/native-ui/choice-half";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { NamePill } from "@little-adventures/native-ui/name-pill";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdventureMenu } from "@/src/adventure-menu";
import { useMapOnTv } from "@/src/cast/use-map-on-tv";
import {
	choicesFrom,
	isOutroLocked,
	missingPlaces,
} from "@/src/data/map-rules";
import { useChildName } from "@/src/data/profile-queries";
import { mark, markScreen } from "@/src/data/timeline";
import type { Adventure, NodeId, Picture, Progress } from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";
import { useLandscape } from "@/src/orientation";
import { useScreenFade } from "@/src/screen-fade";

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
// Sideways the star waits in the gap between the two halves.
const SIDEWAYS_STAR_SIZE = 96;
// The gap between the halves shows the night through.
const HALF_GAP = 3;

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
	progress: Pick<Progress, "outroLocked" | "visited">,
	devDrawing: string | undefined
): Card[] {
	return choicesFrom(from, progress.visited).map(({ locked: ruled, node }) => {
		const place = adventure.places[node];
		const goal = node === "outro";
		const locked = goal ? isOutroLocked(progress) : ruled;
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
function Star({
	size = STAR_SIZE,
	take,
}: {
	size?: number;
	take: "jump" | "point" | "think";
}) {
	return (
		<View pointerEvents="none" style={styles.starRow}>
			<StarTake size={size} take={take} />
		</View>
	);
}

/** What has been walked: the dev override (which never locks the goodnight), else the real progress. */
function walked(
	devVisited: string | undefined,
	progress: Progress | null | undefined
) {
	if (devVisited) {
		return {
			outroLocked: undefined,
			visited: devVisited.split(",") as NodeId[],
		};
	}
	return { outroLocked: progress?.outroLocked, visited: progress?.visited };
}

/** The place tapped: it shows its ring for a moment, then the map walks the star there. */
function usePick(id: string) {
	const router = useRouter();
	const [picked, setPicked] = useState<NodeId | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	const pick = (node: NodeId) => {
		if (picked) {
			return;
		}
		setPicked(node);
		mark("choice", { place: node });
		timer.current = setTimeout(
			() => router.replace(`/map?id=${id}&walkTo=${node}`),
			SELECT_MS
		);
	};
	return { pick, picked };
}

/** The pill at the top of the sideways choice: it also carries the waiting and peek lines. */
function sidewaysTitle({
	goodnightOpen,
	peek,
	waiting,
}: {
	goodnightOpen: boolean;
	peek: Card | undefined;
	waiting: boolean;
}) {
	if (goodnightOpen) {
		return "All 4 places done!";
	}
	if (waiting) {
		return WAITING_LINE;
	}
	return peek ? `Peek at ${peek.name} first?` : "Pick a way";
}

/** Sideways: two full-height pictures, one place each, the star between them, and a title pill. */
function Halves({
	cards,
	missing,
	onPick,
	picked,
	starTake,
	title,
}: {
	cards: Card[];
	missing: number;
	onPick: (node: NodeId) => void;
	picked: NodeId | null;
	starTake: "jump" | "point" | "think" | null;
	title: string;
}) {
	const insets = useSafeAreaInsets();
	const onBack = useBackAction();
	const top = insets.top + layout.topBarOffset;
	return (
		<View style={styles.sideways}>
			<View style={styles.halves}>
				{cards.map((card) => (
					<ChoiceHalf
						key={card.node}
						kind={card.goal ? "goal" : "place"}
						name={card.name}
						note={
							card.state === "locked"
								? `${missing} more ${missing > 1 ? "places" : "place"} first`
								: undefined
						}
						onPress={() => onPick(card.node)}
						picture={card.picture}
						selected={picked === card.node}
						state={card.state}
						testID={`choice-${card.node}`}
					/>
				))}
			</View>
			<View pointerEvents="none" style={[styles.titleRow, { top }]}>
				<NamePill style={styles.pill} text={title} />
			</View>
			{onBack ? (
				<View
					style={[
						styles.backRow,
						{ left: insets.left + layout.sideMargin, top },
					]}
				>
					<BackButton onPress={onBack} />
				</View>
			) : null}
			{starTake ? <Star size={SIDEWAYS_STAR_SIZE} take={starTake} /> : null}
			<AdventureMenu right={insets.right + layout.sideMargin} top={top} />
		</View>
	);
}

/** 13 Choice, 13b goodnight locked, 14 goodnight open, E2 place still drawing. */
/** The screen has what it draws (the same rule as its early return): adventure, walked places, name loaded. */
const hasEverything = (
	adventure: unknown,
	visited: unknown,
	childName: unknown
) => Boolean(adventure && visited) && childName !== undefined;

export default function Choice() {
	const router = useRouter();
	// Opens from the night veil when it follows a place; nothing leaves from here.
	const { veil } = useScreenFade();
	const params = useLocalSearchParams<{
		drawing?: string;
		from?: string;
		id?: string;
		visited?: string;
	}>();
	const id = params.id ?? "box";
	const from = (params.from ?? "intro") as NodeId;
	// Adventure, progress and name come from the shared cache, so the cards paint at once.
	const { adventure, progress } = useAdventure(id);
	const childName = useChildName();
	const sideways = useLandscape();
	const { pick, picked } = usePick(id);
	// The last drawing count marked, so a screen is marked once per count (not on every render).
	const marked = useRef<number | null>(null);

	// Dev only: ?visited=p1,p2 pretends those places were watched, ?drawing=p1a marks one as not drawn yet.
	const devVisited = dev(params.visited);
	const devDrawing = dev(params.drawing);
	const { outroLocked: engineOutroLock, visited } = walked(
		devVisited,
		progress
	);
	const cards =
		adventure && visited
			? cardsOf(
					adventure,
					from,
					{ outroLocked: engineOutroLock, visited },
					devDrawing
				)
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

	// A connected TV shows a picture of the ways to pick, taken again when a card changes.
	const choiceOnTv = useMapOnTv({
		adventureId: id,
		ready: hasEverything(adventure, visited, childName),
		title: "Pick a way",
		version: cards.map((c) => `${c.node}:${c.state}`).join(","),
	});

	if (!(adventure && visited) || childName === undefined) {
		return null;
	}

	const walkTo = (node: NodeId) =>
		router.replace(`/map?id=${id}&walkTo=${node}`);
	const drawingCount = cards.filter((c) => c.state === "drawing").length;
	markScreen(marked, "choice", drawingCount);
	const peek = drawing ? other : undefined;
	const starTake = starTakeFor({ drawing, goodnightOpen, waiting });
	const missing = missingPlaces(visited);

	if (sideways) {
		return (
			<>
				<View collapsable={false} ref={choiceOnTv} style={styles.capture}>
					<Halves
						cards={cards}
						missing={missing}
						onPick={pick}
						picked={picked}
						starTake={starTake}
						title={sidewaysTitle({ goodnightOpen, peek, waiting })}
					/>
				</View>
				{veil}
			</>
		);
	}

	return (
		<>
			<View collapsable={false} ref={choiceOnTv} style={styles.capture}>
				<Screen
					bodyStyle={{
						paddingTop: goodnightOpen ? spacing.sm : CARDS_BELOW_TITLE,
					}}
					dock={
						peek ? (
							<PrimaryButton
								label={`Peek at ${peek.name}`}
								onPress={() => walkTo(peek.node)}
							/>
						) : undefined
					}
					title="Pick a way"
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
								testID={`choice-${card.node}`}
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
			</View>
			{veil}
		</>
	);
}

const styles = StyleSheet.create({
	backRow: { position: "absolute" },
	capture: { flex: 1 },
	cards: { gap: layout.gap },
	done: { marginBottom: layout.gap },
	halves: {
		backgroundColor: colors.deepNavy,
		flex: 1,
		flexDirection: "row",
		gap: HALF_GAP,
	},
	message: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
	pill: { alignSelf: "center" },
	plate: { alignSelf: "center", marginTop: layout.gap },
	sideways: { flex: 1 },
	starRow: {
		alignItems: "center",
		bottom: STAR_BOTTOM,
		left: 0,
		position: "absolute",
		right: 0,
	},
	titleRow: { alignItems: "center", left: 0, position: "absolute", right: 0 },
});
