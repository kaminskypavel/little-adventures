// Puts the engine's adventure onto the app's own types, and holds the rules of the wait.
import {
	type EngineAdventure,
	type EngineMedia,
	type EngineNode,
	type EnginePart,
	type EngineSummary,
	pollAdventure,
} from "./engine-client";
import { PLACES } from "./map-rules";
import type {
	Adventure,
	AdventureSummary,
	MakeStatus,
	NarrationAudio,
	NodeId,
	Part,
	PartStatus,
	Picture,
	Place,
	PlaceStatus,
	Progress,
} from "./types";

const NODE_IDS: readonly NodeId[] = ["intro", ...PLACES, "outro"];
const PLACES_TOTAL = PLACES.length;

/** The first url seen for each file (by storage key), so a fresh read never swaps a playing file. */
export type KnownUrls = Map<string, string>;

const pin = (key: string, url: string, urls: KnownUrls) => {
	const known = urls.get(key);
	if (known) {
		return known;
	}
	urls.set(key, url);
	return url;
};

const urlOf = (media: EngineMedia, urls: KnownUrls) =>
	pin(media.id, media.url, urls);

/** A status not known yet reads as still being made. */
export const partStatus = (status: string): PartStatus =>
	status === "playable" || status === "failed" ? status : "making";

/** A part's url is pinned by the part's id, so a later read never swaps the file that is playing. */
const partOf = (raw: EnginePart, urls: KnownUrls): Part => {
	const status = partStatus(raw.status);
	return {
		durationSec: raw.durationSec ?? null,
		id: raw.id,
		narration: raw.narration
			? {
					durationSec: raw.narration.durationSec,
					url: pin(`part-voice:${raw.id}`, raw.narration.url, urls),
					words: raw.narration.words,
				}
			: null,
		narrationFromSec: raw.narrationFromSec ?? null,
		status,
		url:
			status === "playable" && raw.video
				? pin(`part:${raw.id}`, raw.video.url, urls)
				: null,
	};
};

/**
 * The parts of a node. A node made the older way (no parts, a clip) is one playable part made
 * from its clip; a node with neither has none.
 */
export function partsOf(node: EngineNode, urls: KnownUrls): Part[] {
	if (node.parts?.length) {
		return node.parts.map((part) => partOf(part, urls));
	}
	if (node.clip) {
		return [
			{
				id: node.clip.id,
				status: "playable",
				url: pin(`part:${node.clip.id}`, node.clip.url, urls),
			},
		];
	}
	return [];
}

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

/** The narrator's question: pinned by its storage key (else by node), words on the app's own timing type. */
const questionAudioOf = (
	id: NodeId,
	raw: EngineNode["questionAudio"],
	urls: KnownUrls
): NarrationAudio | null =>
	raw?.url
		? {
				url: pin(raw.id ?? `question-voice:${id}`, raw.url, urls),
				words: (raw.words ?? []).map((w) => ({
					endSec: w.endSec,
					startSec: w.startSec,
					text: w.word ?? w.text ?? "",
				})),
			}
		: null;

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
			parts: [],
			picture: null,
			status: placeStatus("waiting", polling),
		};
	}
	const words = node.narration?.words ?? [];
	return {
		audio: node.narration ? { url: urlOf(node.narration, urls), words } : null,
		fact: node.fact ?? "",
		id,
		name: node.name ?? "",
		narration: words.map((word) => word.text),
		parts: partsOf(node, urls),
		picture: pictureOf(node.picture, urls),
		question: node.question || null,
		questionAudio: questionAudioOf(id, node.questionAudio, urls),
		status: placeStatus(node.status, polling),
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
		music: raw.music
			? { url: pin(`music:${raw.id}`, raw.music.url, urls) }
			: null,
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
		source: raw.source,
		title: raw.title ?? raw.question,
	};
}

/**
 * Where the child has been. Nothing is walked until the engine says so: the map then shows only
 * the intro open. Once any place is walked the intro counts as walked too (it is how they got there).
 */
export function progressOf(raw: EngineAdventure): Progress {
	const any = raw.nodes.some((n) => n.visited);
	const walked = (id: NodeId) =>
		any && (id === "intro" || raw.nodes.some((n) => n.id === id && n.visited));
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

/**
 * Follows the engine until the intro is ready, then calls `onStatus` once with it. Ends in one
 * "failed" after several failed reads in a row, at the wait ceiling (also when a read hangs), or
 * when the engine stops asking for reads with no intro. Returns unsubscribe, after which nothing
 * is called. The clock, sleep and timer are injected so the rules run without a phone.
 */
export function watchIntro({
	after,
	now,
	onStatus,
	read,
	sleep,
}: {
	/** Runs `fn` once after `ms`; returns the cancel. */
	after: (fn: () => void, ms: number) => () => void;
	now: () => number;
	onStatus: (status: MakeStatus) => void;
	read: () => Promise<EngineAdventure>;
	sleep: (ms: number) => Promise<void>;
}): () => void {
	let live = true;
	let patience = initialWait(now());
	const end = (status: MakeStatus) => {
		live = false;
		cancelCeiling();
		onStatus(status);
	};
	onStatus({ progress: 0, stage: 0, state: "making" });
	const cancelCeiling = after(() => {
		if (live) {
			end({ state: "failed" });
		}
	}, WAIT_CEILING_MS);
	pollAdventure({
		isLive: () => live,
		onFailed: () => {
			patience = nextWait(patience, "failed", now());
			if (patience.giveUp) {
				end({ state: "failed" });
			}
		},
		onRead: (raw) => {
			patience = nextWait(patience, "ok", now());
			const status = makeStatusOf(raw);
			if (status.state !== "making") {
				end(status);
			} else if (patience.giveUp) {
				end({ state: "failed" });
			} else {
				onStatus(status);
			}
		},
		read,
		sleep,
	}).then(() => {
		// The engine stopped asking for reads and the intro never came.
		if (live) {
			end({ state: "failed" });
		}
	});
	return () => {
		live = false;
		cancelCeiling();
	};
}
