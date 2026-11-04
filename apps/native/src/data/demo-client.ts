// The no-login demo, read from static files only: an index of the finished adventures and, per
// adventure, the same body the player API sends. Nothing here talks to the engine or the server.
import type { EngineAdventure } from "./engine-client";
import type { AdventureSummary, NodeId, Progress } from "./types";

/** Where the public demo files live. `index.json` and `<id>/adventure.json` sit under it. */
export const DEMO_BASE_DEFAULT = "https://cdn.littleadventures.app/demo/v1";

const PLACES_TOTAL = 4;

export interface DemoEntry {
	child: { age: number | null; kind: string; name: string };
	cover: string | null;
	id: string;
	placesDone: number;
	question: string;
	title: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** The index file as entries. An entry with no id is dropped; anything else missing reads empty. */
export function parseIndex(json: unknown): DemoEntry[] {
	const list =
		isRecord(json) && Array.isArray(json.adventures) ? json.adventures : [];
	return list.flatMap((item): DemoEntry[] => {
		if (!(isRecord(item) && text(item.id))) {
			return [];
		}
		const child = isRecord(item.child) ? item.child : {};
		const cover = isRecord(item.cover) ? text(item.cover.url) : "";
		return [
			{
				child: {
					age: typeof child.age === "number" ? child.age : null,
					kind: text(child.kind),
					name: text(child.name),
				},
				cover: cover || null,
				id: text(item.id),
				placesDone:
					typeof item.placesDone === "number" ? item.placesDone : PLACES_TOTAL,
				question: text(item.question),
				title: text(item.title) || text(item.question),
			},
		];
	});
}

/** One adventure file, checked for the parts the app needs. */
export function parseAdventure(json: unknown): EngineAdventure {
	if (!(isRecord(json) && text(json.id) && Array.isArray(json.nodes))) {
		throw new Error("The demo adventure file is not readable");
	}
	// A recorded adventure is finished: nothing in it is still being made.
	return { ...json, pollAfterSec: null } as unknown as EngineAdventure;
}

export const toDemoSummary = (entry: DemoEntry): AdventureSummary => ({
	finished: entry.placesDone >= PLACES_TOTAL,
	foundCount: entry.placesDone,
	id: entry.id,
	partsDone: entry.placesDone,
	partsTotal: PLACES_TOTAL,
	picture: entry.cover ? { cacheKey: entry.cover, uri: entry.cover } : null,
	title: entry.title,
});

/** Progress after the child watched `node`. A demo always starts fresh: only the intro is open. */
export function stepProgress(
	prev: Progress | undefined,
	node: NodeId
): Progress {
	const visited = prev?.visited ?? [];
	return {
		here: node,
		visited: visited.includes(node) ? [...visited] : [...visited, node],
	};
}

export const FRESH_PROGRESS: Progress = { here: "intro", visited: [] };

export async function getJson(url: string): Promise<unknown> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Could not read ${url} (${res.status})`);
	}
	return res.json();
}
