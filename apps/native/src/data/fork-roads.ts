import type { NodeId } from "./types";

/** The roads of the sideways map: a fork after the intro, two lanes, a merge at the goodnight. */
export const ROADS: readonly (readonly [NodeId, NodeId])[] = [
	["intro", "p1"],
	["intro", "p2"],
	["p1", "p1a"],
	["p2", "p2a"],
	["p1", "p2"],
	["p1a", "p2a"],
	["p1a", "outro"],
	["p2a", "outro"],
];

/** The id of the road between two nodes, in the order the road is listed in `ROADS`. */
export const roadId = (a: NodeId, b: NodeId): string | undefined => {
	const road = ROADS.find(
		([from, to]) => (from === a && to === b) || (from === b && to === a)
	);
	return road ? `${road[0]}-${road[1]}` : undefined;
};

const BY_NODE = (node: NodeId) =>
	ROADS.flatMap(([a, b]) => {
		if (a === node) {
			return [b];
		}
		return b === node ? [a] : [];
	});

/**
 * The nodes not walked yet that a road joins to walked ground: the places the child can go next
 * from anywhere on the map, as the star walks there along the roads. Unlike the choice rules
 * from one place, a place left last is never cut off, whichever place the star stands on.
 */
export const frontier = (visited: readonly NodeId[]): NodeId[] =>
	[...new Set(visited.flatMap(BY_NODE))].filter(
		(node) => !visited.includes(node)
	);

// One step costs 10; a stop on a place not yet walked costs 1 more, so a route prefers walked ground.
const STEP = 10;

/**
 * The nodes from `from` to `to` along the roads: fewest roads first, then through places already
 * walked. The goodnight is only ever the last stop.
 */
export function pathBetween(
	from: NodeId,
	to: NodeId,
	visited: readonly NodeId[]
): NodeId[] {
	let best: { cost: number; path: NodeId[] } | null = null;
	const walk = (path: NodeId[], cost: number) => {
		const at = path.at(-1) as NodeId;
		if (at === to) {
			if (!best || cost < best.cost) {
				best = { cost, path };
			}
			return;
		}
		for (const next of BY_NODE(at)) {
			if (path.includes(next) || (next === "outro" && to !== "outro")) {
				continue;
			}
			const unwalked = next !== to && !visited.includes(next) ? 1 : 0;
			walk([...path, next], cost + STEP + unwalked);
		}
	};
	walk([from], 0);
	return (best as { path: NodeId[] } | null)?.path ?? [from];
}

/**
 * The roads the child walked: both ends walked. Until the goodnight, the two roads out of the
 * intro are the exception: only the one to the first place walked, as the other lane is reached
 * from its neighbour. At the goodnight the whole road shines.
 */
export function litRoads(visited: readonly NodeId[]): Set<string> {
	const first = visited[1];
	const finished = visited.includes("outro");
	const lit = new Set<string>();
	for (const [a, b] of ROADS) {
		const walked = visited.includes(a) && visited.includes(b);
		if (walked && (finished || a !== "intro" || b === first)) {
			lit.add(`${a}-${b}`);
		}
	}
	return lit;
}

/** The roads from `here` to the places that are ready: the dotted roads. */
export function dottedRoads(
	here: NodeId,
	ready: readonly NodeId[],
	visited: readonly NodeId[]
): Set<string> {
	const dots = new Set<string>();
	for (const node of ready) {
		const path = pathBetween(here, node, visited);
		for (const [index, stop] of path.slice(1).entries()) {
			const id = roadId(path[index] as NodeId, stop);
			if (id) {
				dots.add(id);
			}
		}
	}
	return dots;
}
