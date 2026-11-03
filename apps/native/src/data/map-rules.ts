import type { NodeId, Progress } from "./types";

export const PLACES: NodeId[] = ["p1", "p2", "p1a", "p2a"];

const EDGES: Record<NodeId, NodeId[]> = {
	intro: ["p1", "p2"],
	outro: [],
	p1: ["p1a", "p2"],
	p1a: ["p2", "p2a", "outro"],
	p2: ["p2a", "p1"],
	p2a: ["p1", "p1a", "outro"],
};

/** Choice candidates from a node (never intro). */
export const neighbours = (node: NodeId): NodeId[] => EDGES[node];

export const missingPlaces = (visited: NodeId[]): number =>
	PLACES.filter((p) => !visited.includes(p)).length;

export const isGoodnightOpen = (visited: NodeId[]): boolean =>
	missingPlaces(visited) === 0;

/** Goodnight is locked: the engine's word when it gave one, else the four-places rule. */
export const isOutroLocked = ({
	outroLocked,
	visited,
}: Pick<Progress, "outroLocked" | "visited">): boolean =>
	outroLocked ?? !isGoodnightOpen(visited);

export const choicesFrom = (
	node: NodeId,
	visited: NodeId[]
): { node: NodeId; locked: boolean }[] =>
	neighbours(node).map((n) => ({
		locked: n === "outro" && !isGoodnightOpen(visited),
		node: n,
	}));

/**
 * The places that open from their seal now, for the first time: ready to walk to, and not shown
 * open on the map before (`seen`). The intro is never sealed, so it never opens this way.
 */
export const newlyOpened = (
	seen: readonly NodeId[],
	ready: readonly NodeId[]
): NodeId[] => ready.filter((node) => node !== "intro" && !seen.includes(node));
