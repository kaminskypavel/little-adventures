import type { NodeId, Progress } from "./types";

export const PLACES: NodeId[] = ["p1", "p2", "p1a", "p2a"];

const EDGES: Record<NodeId, NodeId[]> = {
	intro: ["p1", "p2"],
	outro: [],
	p1: ["p1a", "p2"],
	p1a: ["p2", "outro"],
	p2: ["p2a", "p1"],
	p2a: ["p1", "outro"],
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
