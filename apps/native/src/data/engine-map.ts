// Puts the engine's adventure onto the app's own types, and holds the rules of the wait.
import type {
	EngineAdventure,
	EngineMedia,
	EngineNode,
	EngineSummary,
} from "./engine-client";
import type {
	Adventure,
	AdventureSummary,
	MakeStatus,
	NodeId,
	Picture,
	Place,
	PlaceStatus,
	Progress,
} from "./types";

export const NODE_IDS: readonly NodeId[] = [
	"intro",
	"p1",
	"p2",
	"p1a",
	"p2a",
	"outro",
];
export const PLACES_TOTAL = 4;

/** The first url seen for each file (by storage key), so a fresh read never swaps a playing file. */
export type KnownUrls = Map<string, string>;

const urlOf = (media: EngineMedia, urls: KnownUrls) => {
	const known = urls.get(media.id);
	if (known) {
		return known;
	}
	urls.set(media.id, media.url);
	return media.url;
};

const pictureOf = (
	media: EngineMedia | null,
	urls: KnownUrls
): Picture | null =>
	media ? { cacheKey: media.id, uri: urlOf(media, urls) } : null;

/**
 * Ready is ready. Anything else (waiting, making, failed, a status not known yet) reads as still
 * being drawn, but only while the adventure still polls: once the engine stops asking for reads
 * nothing more is coming, so nothing may stay drawing for ever.
 */
export const placeStatus = (status: string, polling: boolean): PlaceStatus =>
	status === "ready" || !polling ? "ready" : "drawing";

function toPlace(
	id: NodeId,
	node: EngineNode | undefined,
	polling: boolean,
	urls: KnownUrls
): Place {
	if (!node) {
		return {
			fact: "",
			id,
			name: "",
			narration: [],
			picture: null,
			status: placeStatus("waiting", polling),
			video: null,
		};
	}
	const words = node.narration?.words ?? [];
	return {
		audio: node.narration ? { url: urlOf(node.narration, urls), words } : null,
		fact: node.fact ?? "",
		id,
		name: node.name ?? "",
		narration: words.map((word) => word.text),
		picture: pictureOf(node.picture, urls),
		status: placeStatus(node.status, polling),
		video: node.clip ? urlOf(node.clip, urls) : null,
	};
}

export function toAdventure(raw: EngineAdventure, urls: KnownUrls): Adventure {
	const polling = raw.pollAfterSec !== null && raw.pollAfterSec !== undefined;
	return {
		endGoal: {
			closed: pictureOf(raw.endGoal.closed, urls),
			name: raw.endGoal.name ?? "",
			open: pictureOf(raw.endGoal.open, urls),
		},
		id: raw.id,
		places: Object.fromEntries(
			NODE_IDS.map((id) => [
				id,
				toPlace(
					id,
					raw.nodes.find((n) => n.id === id),
					polling,
					urls
				),
			])
		) as Record<NodeId, Place>,
		pollAfterSec: raw.pollAfterSec ?? null,
		question: raw.question,
		title: raw.title ?? raw.question,
	};
}

/** Where the child has been. The intro counts as walked from the start, as in the bundled map. */
export function progressOf(raw: EngineAdventure): Progress {
	const walked = (id: NodeId) =>
		id === "intro" || raw.nodes.some((n) => n.id === id && n.visited);
	const visited = NODE_IDS.filter(walked);
	return {
		here: visited.at(-1) ?? "intro",
		outroLocked: raw.nodes.find((n) => n.id === "outro")?.locked,
		visited,
	};
}

/** What the wait screen shows for one read: failed, ready once the intro is, else how far along. */
export function makeStatusOf(raw: EngineAdventure): MakeStatus {
	if (raw.status === "failed") {
		return { state: "failed" };
	}
	const goalName = raw.endGoal.name || undefined;
	const intro = raw.nodes.find((n) => n.id === "intro");
	if (intro?.status === "ready") {
		return { goalName, state: "ready" };
	}
	let stage = 1;
	if (raw.status === "writing") {
		stage = 0;
	} else if (intro?.status === "making") {
		stage = 2;
	}
	return { goalName, progress: 0, stage, state: "making" };
}

export function toSummary(
	item: EngineSummary,
	urls: KnownUrls = new Map()
): AdventureSummary {
	return {
		finished: item.placesDone >= PLACES_TOTAL,
		foundCount: item.placesDone,
		id: item.id,
		partsDone: item.placesDone,
		partsTotal: PLACES_TOTAL,
		picture: pictureOf(item.cover, urls),
		title: item.title ?? item.question,
	};
}

// The wait for the intro. It ends at a ceiling on the total time, or after several reads that
// failed one after another; the screen then goes to the oops screen.
export const WAIT_CEILING_MS = 6 * 60 * 1000;
export const MAX_FAILED_READS = 4;

export interface WaitState {
	failedReads: number;
	giveUp: boolean;
	startedAt: number;
}

export const initialWait = (now: number): WaitState => ({
	failedReads: 0,
	giveUp: false,
	startedAt: now,
});

export function nextWait(
	state: WaitState,
	read: "ok" | "failed",
	now: number
): WaitState {
	const failedReads = read === "failed" ? state.failedReads + 1 : 0;
	return {
		...state,
		failedReads,
		giveUp:
			failedReads >= MAX_FAILED_READS ||
			now - state.startedAt >= WAIT_CEILING_MS,
	};
}
