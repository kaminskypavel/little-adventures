import {
	BackButton,
	useBackAction,
} from "@little-adventures/native-ui/back-button";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import { NamePill } from "@little-adventures/native-ui/name-pill";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	colors,
	layout,
	radii,
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
	ChoicePhotos,
	enterMs,
	NightBackdrop,
	TitleArrival,
	type Way,
} from "@/src/choice-photos";
import {
	choicesFrom,
	isOutroLocked,
	missingPlaces,
} from "@/src/data/map-rules";
import { useChildName } from "@/src/data/profile-queries";
import { choiceLabel } from "@/src/data/question-rules";
import { mark, markScreen } from "@/src/data/timeline";
import type { Adventure, NodeId, Progress } from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";
import { useLandscape } from "@/src/orientation";
import { useScreenFade } from "@/src/screen-fade";

// How long the picked card shows its ring before the map takes over.
const SELECT_MS = 250;
// Round 7 puts the cards 150 pt from the top, 28 pt under the one-line headline.
const CARDS_BELOW_TITLE = 28;
// Round 7 message lines: 800 at 21 pt.
const LINE = { fontSize: 21, lineHeight: 26 } as const;
const WAITING_LINE = "Still being drawn. One moment.";
// The replay button: the gap to the burger beside it, and its icon (the burger glyph is about as big).
const REPLAY_GAP = 8;
const REPLAY_ICON = 24;
/** The cards to choose from at `from`: a locked or still-drawing place shows as such. */
function cardsOf(
	adventure: Adventure,
	from: NodeId,
	progress: Pick<Progress, "outroLocked" | "visited">,
	devDrawing: string | undefined
): Way[] {
	return choicesFrom(from, progress.visited).map(({ locked: ruled, node }) => {
		const place = adventure.places[node];
		const goal = node === "outro";
		const locked = goal ? isOutroLocked(progress) : ruled;
		let { picture } = place;
		if (goal) {
			picture = locked ? adventure.endGoal.closed : adventure.endGoal.open;
		}
		let state: Way["state"] = "open";
		if (locked) {
			state = "locked";
		} else if (node === devDrawing || place.status === "drawing") {
			state = "drawing";
		}
		return {
			goal,
			label: choiceLabel(place),
			name: place.name,
			node,
			picture,
			state,
		};
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

/**
 * The round button that plays the place just watched again, in the corner the burger menu sits
 * in (so beside it, to its left, where there is a menu). Same size and clay as the burger.
 */
function ReplayButton({
	beside,
	onPress,
}: {
	/** There is a menu in the corner: the button stands to its left. */
	beside: boolean;
	onPress: () => void;
}) {
	const insets = useSafeAreaInsets();
	return (
		<View
			pointerEvents="box-none"
			style={[
				styles.replay,
				{
					right:
						insets.right +
						layout.sideMargin +
						(beside ? layout.minTarget + REPLAY_GAP : 0),
					top: insets.top + layout.topBarOffset,
				},
			]}
		>
			<ClayPressable
				accessibilityLabel="Watch it again"
				onPress={onPress}
				radius={radii.full}
				style={styles.replayButton}
			>
				<Icon color={colors.inkNavy} name="replay" size={REPLAY_ICON} />
			</ClayPressable>
		</View>
	);
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
	peek: Way | undefined;
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

/** Sideways: the ways as storybook photos on the night sky, the star between them, a title pill. */
function Sideways({
	delay,
	missing,
	onPick,
	picked,
	starTake,
	title,
	ways,
}: {
	delay: number;
	missing: number;
	onPick: (node: NodeId) => void;
	picked: NodeId | null;
	starTake: "jump" | "point" | "think" | null;
	title: string;
	ways: Way[];
}) {
	const insets = useSafeAreaInsets();
	const onBack = useBackAction();
	const top = insets.top + layout.topBarOffset;
	return (
		<View style={styles.sideways}>
			<NightBackdrop />
			<ChoicePhotos
				delay={delay}
				missing={missing}
				onPick={onPick}
				picked={picked}
				sideways
				starTake={starTake}
				ways={ways}
			/>
			<View pointerEvents="none" style={[styles.titleRow, { top }]}>
				<TitleArrival delay={delay}>
					<NamePill style={styles.pill} text={title} />
				</TitleArrival>
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
	const { held, holdMs, leave, veil } = useScreenFade();
	// The photos arrive as the night-sky veil clears (after its hold), or at once when it did not close.
	const [enterDelay] = useState(held ? holdMs : 0);
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
	const goodnightOpen = goodnight?.state === "open";
	const drawing = cards.some((c) => c.state === "drawing");
	const other = cards.find((c) => c.state === "open");
	const waiting = drawing && !other;

	useEffect(() => {
		if (goodnightOpen) {
			notificationAsync(NotificationFeedbackType.Success);
		}
	}, [goodnightOpen]);

	// The TV photographs the ways only once they have all arrived.
	const [arrived, setArrived] = useState(false);
	const arriveMs = enterDelay + enterMs(cards.length);
	useEffect(() => {
		const timer = setTimeout(() => setArrived(true), arriveMs);
		return () => clearTimeout(timer);
	}, [arriveMs]);

	// A connected TV shows a picture of the ways to pick, taken again when a card changes.
	const choiceOnTv = useMapOnTv({
		adventureId: id,
		ready: arrived && hasEverything(adventure, visited, childName),
		title: "Pick a way",
		version: cards.map((c) => `${c.node}:${c.state}`).join(","),
	});

	if (!(adventure && visited) || childName === undefined) {
		return <>{veil}</>;
	}

	const walkTo = (node: NodeId) =>
		router.replace(`/map?id=${id}&walkTo=${node}`);
	const drawingCount = cards.filter((c) => c.state === "drawing").length;
	markScreen(marked, "choice", drawingCount);
	const peek = drawing ? other : undefined;
	const starTake = starTakeFor({ drawing, goodnightOpen, waiting });
	const missing = missingPlaces(visited);

	// Watch the place just come from again: through the night sky, then its video.
	const replay = (
		<ReplayButton
			beside={sideways}
			onPress={() =>
				leave(() => router.replace(`/place?id=${id}&node=${from}`))
			}
		/>
	);

	if (sideways) {
		return (
			<>
				<View collapsable={false} ref={choiceOnTv} style={styles.capture}>
					<Sideways
						delay={enterDelay}
						missing={missing}
						onPick={pick}
						picked={picked}
						starTake={starTake}
						title={sidewaysTitle({ goodnightOpen, peek, waiting })}
						ways={cards}
					/>
				</View>
				{replay}
				{veil}
			</>
		);
	}

	return (
		<>
			<View collapsable={false} ref={choiceOnTv} style={styles.capture}>
				<NightBackdrop />
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
						<ChoicePhotos
							delay={enterDelay}
							missing={missing}
							onPick={pick}
							picked={picked}
							sideways={false}
							starTake={starTake}
							ways={cards}
						/>
					</View>
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
				</Screen>
			</View>
			{replay}
			{veil}
		</>
	);
}

const styles = StyleSheet.create({
	backRow: { position: "absolute" },
	capture: { flex: 1 },
	cards: { flex: 1 },
	done: { marginBottom: layout.gap },
	message: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
	pill: { alignSelf: "center" },
	replay: { position: "absolute" },
	replayButton: {
		alignItems: "center",
		height: layout.minTarget,
		justifyContent: "center",
		width: layout.minTarget,
	},
	sideways: { flex: 1 },
	titleRow: { alignItems: "center", left: 0, position: "absolute", right: 0 },
});
