import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ForkMap } from "@little-adventures/native-ui/fork-map";
import { topRightCorner } from "@little-adventures/native-ui/fork-spots";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	MapBackdrop,
	type MapGoodnight,
	type MapPlace,
	type MapPlaceNode,
	StoryMap,
} from "@little-adventures/native-ui/story-map";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaFrame } from "react-native-safe-area-context";
import { AdventureMenu } from "@/src/adventure-menu";
import { MapCastButton } from "@/src/cast/map-cast-button";
import { useMapOnTv } from "@/src/cast/use-map-on-tv";
import { dottedRoads, litRoads, pathBetween } from "@/src/data/fork-roads";
import { isOutroLocked, neighbours } from "@/src/data/map-rules";
import { useChildName } from "@/src/data/profile-queries";
import { mapLabel } from "@/src/data/question-rules";
import { markScreen } from "@/src/data/timeline";
import type { NodeId, Progress } from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";
import { useLandscape } from "@/src/orientation";
import { useScreenFade } from "@/src/screen-fade";

const NODE_IDS: readonly string[] = [
	"intro",
	"p1",
	"p2",
	"p1a",
	"p2a",
	"outro",
];
const PLACE_IDS: readonly MapPlaceNode[] = ["intro", "p1", "p2", "p1a", "p2a"];

const isNode = (value?: string): value is NodeId =>
	value !== undefined && NODE_IDS.includes(value);

/** The stops the sideways star walks: none before anything is walked (no star), else where it stands. */
function routeOf({
	fresh,
	here,
	visited,
	walkTo,
}: {
	fresh: boolean;
	here: NodeId;
	visited: readonly NodeId[];
	walkTo?: NodeId;
}): NodeId[] {
	if (walkTo) {
		return pathBetween(here, walkTo, visited);
	}
	return fresh ? [] : [here];
}

/** The places the child can go to next: none before anything is walked (the intro is tapped first). */
const nextFrom = (progress: Progress): NodeId[] =>
	progress.visited.length === 0 ? [] : neighbours(progress.here);

/** How a place shows: nothing walked leaves only the intro open; then here, walked, drawing, next, locked. */
function placeState({
	drawing,
	fresh,
	next,
	node,
	progress,
}: {
	drawing: boolean;
	fresh: boolean;
	next: readonly NodeId[];
	node: NodeId;
	progress: Progress;
}): MapPlace["state"] {
	if (fresh) {
		return node === "intro" ? "ready" : "default";
	}
	if (node === progress.here) {
		return "here";
	}
	if (progress.visited.includes(node)) {
		return "done";
	}
	if (drawing) {
		return "drawing";
	}
	return next.includes(node) ? "ready" : "default";
}

/** Sideways: the fork road. The star walks the roads, so its route is every stop on the way. */
function SidewaysMap({
	goodnight,
	goodnightOpen,
	next,
	onOpen,
	onWalked,
	places,
	progress,
	title,
	walkTo,
}: {
	goodnight: MapGoodnight;
	goodnightOpen: boolean;
	next: readonly NodeId[];
	onOpen: (node: NodeId) => void;
	onWalked: () => void;
	places: Record<MapPlaceNode, MapPlace>;
	progress: Progress;
	title: string;
	walkTo?: NodeId;
}) {
	const { here, visited } = progress;
	// Nothing walked yet: the star is not here until the intro is tapped.
	const fresh = visited.length === 0;
	const ready: NodeId[] = PLACE_IDS.filter(
		(node) => places[node].state === "ready"
	);
	if (goodnightOpen && next.includes("outro") && !visited.includes("outro")) {
		ready.push("outro");
	}
	const atGoodnight = here === "outro";
	return (
		<ForkMap
			button={
				<PrimaryButton
					disabled={walkTo !== undefined}
					icon={atGoodnight ? undefined : "play"}
					label={atGoodnight ? "Say goodnight" : "Keep walking"}
					labelSize={21}
					onPress={() => onOpen(here)}
					size="md"
					style={styles.sidewaysButton}
					testID="keep-walking"
				/>
			}
			dots={dottedRoads(here, ready, visited)}
			goodnight={goodnight}
			here={here}
			lit={litRoads(visited)}
			onWalked={onWalked}
			places={places}
			route={routeOf({ fresh, here, visited, walkTo })}
			title={title}
			walkTo={walkTo}
		/>
	);
}

/** The adventure menu, in the corner of the sideways map where the Grown-ups lock used to be. */
function SidewaysMenu() {
	// The screen's own size: on the web preview the window is wider than the phone it shows.
	const { height, width } = useSafeAreaFrame();
	const { right, top } = topRightCorner(width, height);
	return <AdventureMenu right={right} top={top} />;
}

/** 11 Story map: the hub. `?walkTo=<node>` walks the star there, then opens the place. */
export default function StoryMapScreen() {
	const router = useRouter();
	const { leave, veil } = useScreenFade();
	const sideways = useLandscape();
	const params = useLocalSearchParams<{
		id?: string;
		visited?: string;
		walkTo?: string;
	}>();
	const id = params.id ?? "box";
	const walkTo = isNode(params.walkTo) ? params.walkTo : undefined;
	const { adventure, progress: stored } = useAdventure(id);
	// From the shared cache, so the title is there on the first frame.
	const childName = useChildName() ?? "";
	// The last drawing count marked, so a screen is marked once per count (not on every render).
	const marked = useRef<number | null>(null);

	// Dev only: ?visited=intro,p1 pretends those places were walked, in that order.
	const devVisited = dev(params.visited)?.split(",").filter(isNode);
	const progress: Progress | null = devVisited?.length
		? { here: devVisited.at(-1) as NodeId, visited: devVisited }
		: stored;

	// A connected TV shows a picture of this map, taken again when a place is walked or drawn.
	const mapOnTv = useMapOnTv({
		adventureId: id,
		ready: Boolean(adventure && progress) && walkTo === undefined,
		title: adventure?.endGoal.name ?? "",
		version: [
			progress?.here,
			progress?.visited.join(","),
			PLACE_IDS.map((node) => adventure?.places[node].status).join(","),
		].join("|"),
	});

	const openPlace = (node: NodeId) =>
		leave(() => router.replace(`/place?id=${id}&node=${node}`));

	let content: ReactNode = null;
	let fork: ReactNode = null;
	if (adventure && progress) {
		// Nothing walked yet: everything is locked but the intro, and the star is not out.
		const fresh = progress.visited.length === 0;
		const next = nextFrom(progress);
		const stateOf = (node: NodeId): MapPlace["state"] =>
			placeState({
				drawing: adventure.places[node].status === "drawing",
				fresh,
				next,
				node,
				progress,
			});
		const place = (node: MapPlaceNode): MapPlace => {
			const state = stateOf(node);
			const reachable =
				state === "here" || state === "ready" || state === "done";
			const go = () =>
				node === progress.here
					? openPlace(node)
					: router.setParams({ walkTo: node });
			const said = mapLabel(
				adventure.places[node],
				progress.visited.includes(node)
			);
			return {
				// Every place shows its name plate (the user's call, 2026-11-01).
				label: true,
				// A place with a question says it before the visit and answers after.
				lesson: said.kind === "name" ? undefined : { ...said, kind: said.kind },
				name: adventure.places[node].name,
				onPress: reachable ? go : undefined,
				picture: adventure.places[node].picture,
				state,
			};
		};
		const places = Object.fromEntries(
			PLACE_IDS.map((node) => [node, place(node)])
		) as Record<MapPlaceNode, MapPlace>;
		const drawing = PLACE_IDS.filter(
			(node) => adventure.places[node].status === "drawing"
		).length;
		markScreen(marked, "map", drawing);
		const goodnightOpen = !isOutroLocked(progress);
		// The road just walked glows: from the node visited before this one, to this one.
		const at = progress.visited.indexOf(progress.here);

		const goodnight = {
			image: goodnightOpen ? adventure.endGoal.open : adventure.endGoal.closed,
			locked: !goodnightOpen,
			name: adventure.places.outro.name,
		};
		fork = (
			<SidewaysMap
				goodnight={goodnight}
				goodnightOpen={goodnightOpen}
				next={next}
				onOpen={openPlace}
				onWalked={() => {
					if (walkTo) {
						impactAsync(ImpactFeedbackStyle.Soft).catch(() => undefined);
						openPlace(walkTo);
					}
				}}
				places={places}
				progress={progress}
				title={childName ? `${childName}'s map` : ""}
				walkTo={walkTo}
			/>
		);

		content = (
			<StoryMap
				glowFrom={at > 0 ? progress.visited[at - 1] : undefined}
				goodnight={goodnight}
				here={progress.here}
				hideStar={fresh}
				next={next}
				onWalked={() => {
					if (walkTo) {
						// A soft landing tap as the star arrives, then the place opens.
						impactAsync(ImpactFeedbackStyle.Soft).catch(() => undefined);
						openPlace(walkTo);
					}
				}}
				places={places}
				walkTo={walkTo}
			/>
		);
	}

	const screen = (
		<>
			<MapBackdrop />
			<Screen
				bodyFade={false}
				dock={
					<PrimaryButton
						disabled={!progress || walkTo !== undefined}
						icon="play"
						label="Keep walking"
						onPress={() => progress && openPlace(progress.here)}
						testID="keep-walking"
					/>
				}
				topBar={
					<TopBar
						action={{
							accessibilityLabel: "Grown-ups",
							icon: "lock",
							onPress: () => router.push("/gate"),
						}}
						title={childName ? `${childName}'s map` : ""}
					/>
				}
			>
				{content}
			</Screen>
		</>
	);

	// Sideways, the fork road takes the whole screen.
	const shown = sideways ? fork : screen;
	// The menu (sideways) or the Cast button (upright) floats over the map, outside the view that
	// is photographed for the TV.
	return (
		<View style={styles.capture}>
			<View collapsable={false} ref={mapOnTv} style={styles.capture}>
				{shown}
			</View>
			{sideways ? <SidewaysMenu /> : <MapCastButton />}
			{veil}
		</View>
	);
}

const styles = StyleSheet.create({
	capture: { flex: 1 },
	sidewaysButton: { height: 60, paddingHorizontal: 24 },
});
