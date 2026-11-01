import { PrimaryButton } from "@little-adventures/native-ui/button";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	MapBackdrop,
	type MapPlace,
	type MapPlaceNode,
	StoryMap,
} from "@little-adventures/native-ui/story-map";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { getProfile } from "@/src/data/adventure-client";
import { isOutroLocked, neighbours } from "@/src/data/map-rules";
import type { NodeId, Progress } from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";

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

/** 11 Story map: the hub. `?walkTo=<node>` walks the star there, then opens the place. */
export default function StoryMapScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{
		id?: string;
		visited?: string;
		walkTo?: string;
	}>();
	const id = params.id ?? "box";
	const walkTo = isNode(params.walkTo) ? params.walkTo : undefined;
	const { adventure, progress: stored } = useAdventure(id);
	const [childName, setChildName] = useState("");

	useEffect(() => {
		let live = true;
		getProfile().then((p) => live && setChildName(p.childName));
		return () => {
			live = false;
		};
	}, []);

	// Dev only: ?visited=intro,p1 pretends those places were walked, in that order.
	const devVisited = dev(params.visited)?.split(",").filter(isNode);
	const progress: Progress | null = devVisited?.length
		? { here: devVisited.at(-1) as NodeId, visited: devVisited }
		: stored;

	const openPlace = (node: NodeId) =>
		router.replace(`/place?id=${id}&node=${node}`);

	let content: ReactNode = null;
	if (adventure && progress) {
		const next = neighbours(progress.here);
		const stateOf = (node: NodeId): MapPlace["state"] => {
			if (node === progress.here) {
				return "here";
			}
			if (progress.visited.includes(node)) {
				return "done";
			}
			if (adventure.places[node].status === "drawing") {
				return "drawing";
			}
			return next.includes(node) ? "ready" : "default";
		};
		const place = (node: MapPlaceNode): MapPlace => {
			const state = stateOf(node);
			const reachable =
				state === "here" || state === "ready" || state === "done";
			const go = () =>
				node === progress.here
					? openPlace(node)
					: router.setParams({ walkTo: node });
			return {
				// Every place shows its name plate (the user's call, 2026-11-01).
				label: true,
				name: adventure.places[node].name,
				onPress: reachable ? go : undefined,
				picture: adventure.places[node].picture,
				state,
			};
		};
		const places = Object.fromEntries(
			PLACE_IDS.map((node) => [node, place(node)])
		) as Record<MapPlaceNode, MapPlace>;
		const goodnightOpen = !isOutroLocked(progress);
		// The road just walked glows: from the node visited before this one, to this one.
		const at = progress.visited.indexOf(progress.here);

		content = (
			<StoryMap
				glowFrom={at > 0 ? progress.visited[at - 1] : undefined}
				goodnight={{
					image: goodnightOpen
						? adventure.endGoal.open
						: adventure.endGoal.closed,
					locked: !goodnightOpen,
					name: adventure.places.outro.name,
				}}
				here={progress.here}
				next={next}
				onWalked={() => walkTo && openPlace(walkTo)}
				places={places}
				walkTo={walkTo}
			/>
		);
	}

	return (
		<>
			<MapBackdrop />
			<Screen
				dock={
					<PrimaryButton
						disabled={!progress || walkTo !== undefined}
						icon="play"
						label="Keep walking"
						onPress={() => progress && openPlace(progress.here)}
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
}
