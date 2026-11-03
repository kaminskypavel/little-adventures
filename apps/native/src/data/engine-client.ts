// The engine's player API, as the app uses it. Objects and enums are open: unknown fields and
// values are tolerated, so statuses are plain strings here.

/** How an adventure is drawn. The engine defaults to clay. */
export type Style = "animated" | "clay" | "felt" | "wood";

/** A stored file: `id` is its storage key (cache by it), `url` is presigned for 2 hours. */
export interface EngineMedia {
	id: string;
	url: string;
}
interface EngineWord {
	endSec: number;
	startSec: number;
	text: string;
}
type EngineNarration = EngineMedia & { words: EngineWord[] };
/** One part of a node's video. `video` is set only when `status` is "playable". */
export interface EnginePart {
	id: string;
	status: string;
	video: EngineMedia | null;
}
export interface EngineNode {
	/** The older single clip; null for nodes made in parts, and when none could be made. */
	clip: EngineMedia | null;
	fact: string | null;
	id: string;
	/** True for goodnight until all 4 places are visited. */
	locked: boolean;
	name: string | null;
	narration: EngineNarration | null;
	neighbours: string[];
	/** The video in parts, played back to back. Null or absent: use `clip`. */
	parts?: EnginePart[] | null;
	picture: EngineMedia | null;
	status: string;
	visited: boolean;
}
export interface EngineAdventure {
	endGoal: {
		closed: EngineMedia | null;
		name: string | null;
		open: EngineMedia | null;
	};
	id: string;
	/** In order: intro, p1, p2, p1a, p2a, outro. */
	nodes: EngineNode[];
	/** Seconds until the next read while any node is not ready or failed; null once all are. */
	pollAfterSec: number | null;
	question: string;
	source: string;
	status: string;
	title: string | null;
}
export interface EngineSummary {
	cover: EngineMedia | null;
	id: string;
	placesDone: number;
	question: string;
	source: string;
	status: string;
	title: string | null;
}
/** The admin switches for the paid steps of a live adventure (the effective values). */
export interface EngineSteps {
	pictures: boolean;
	story: boolean;
	video: boolean;
	voice: boolean;
}
/** The signed-in account as the engine knows it. `live` is the admin switch for real adventures. */
export interface EngineMe {
	email?: string;
	id: string;
	isAdmin: boolean;
	live: boolean;
	name?: string;
	steps: EngineSteps;
}
/**
 * The place as one video for the TV: a presigned read url and how long it plays, plus the
 * WebVTT read-along words (null when the place has none).
 */
export interface CastMedia {
	durationSec: number;
	subtitlesUrl: string | null;
	url: string;
}
/** Where to put the map picture for the TV (presigned PUT) and where the TV reads it (GET). */
export interface CastMapTarget {
	putUrl: string;
	url: string;
}
export interface VisitResult {
	outroLocked: boolean;
	placesDone: number;
}

/** fetch against `<engine>/api/v1`, with the bearer token and the sign-in rule already applied. */
export type EngineFetch = (
	path: string,
	init?: RequestInit
) => Promise<Response>;

/** The engine answered with an error body `{ code, message }`. */
export class EngineError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = "EngineError";
		this.code = code;
		this.status = status;
	}
}

export function createEngineClient(engineFetch: EngineFetch) {
	async function call<T>(path: string, init?: RequestInit): Promise<T> {
		const res = await engineFetch(path, init);
		if (!res.ok) {
			const body = (await res.json().catch(() => null)) as {
				code?: string;
				message?: string;
			} | null;
			throw new EngineError(
				res.status,
				body?.code ?? "UNKNOWN",
				body?.message ?? res.statusText
			);
		}
		return (await res.json()) as T;
	}

	return {
		/**
		 * The place as one video for the TV. May take up to 30 s the first time. Null on 409: the
		 * place has no video or narration yet (or a part is still being made), so play it here.
		 */
		cast: async (id: string, node: string): Promise<CastMedia | null> => {
			try {
				return await call<CastMedia>(
					`/adventures/${encodeURIComponent(id)}/nodes/${encodeURIComponent(node)}/cast`,
					{ method: "POST" }
				);
			} catch (error) {
				if (error instanceof EngineError && error.status === 409) {
					return null;
				}
				throw error;
			}
		},
		/**
		 * A fresh place to upload the map picture for the TV. With the picture's size in bytes
		 * (up to 5 MB) the upload url is signed for exactly that length.
		 */
		castMap: (id: string, contentLength?: number) =>
			call<CastMapTarget>(
				`/adventures/${encodeURIComponent(id)}/cast-map`,
				contentLength === undefined
					? { method: "POST" }
					: {
							body: JSON.stringify({ contentLength }),
							headers: { "content-type": "application/json" },
							method: "POST",
						}
			),
		createAdventure: (childId: string, question: string, style: Style) =>
			call<{ id: string; source: string; status: string }>("/adventures", {
				body: JSON.stringify({ childId, question, style }),
				headers: { "content-type": "application/json" },
				method: "POST",
			}),
		/** Starts preparing an adventure for the question; `startDraft` commits it. */
		createDraft: (childId: string, question: string) =>
			call<{ id: string; status: string }>("/adventures/drafts", {
				body: JSON.stringify({ childId, question }),
				headers: { "content-type": "application/json" },
				method: "POST",
			}),
		getAdventure: (id: string) =>
			call<EngineAdventure>(`/adventures/${encodeURIComponent(id)}`),
		getMe: () => call<EngineMe>("/me"),
		listAdventures: async () =>
			(await call<{ items: EngineSummary[] }>("/adventures")).items,
		/** Up to 10 one-sentence fun facts about the question, for the wait. Empty when none. */
		loaderFacts: (question: string, age?: number) =>
			call<{ facts: string[] }>("/questions/facts", {
				body: JSON.stringify({ age, question }),
				headers: { "content-type": "application/json" },
				method: "POST",
			}),
		/** Gets the child's next adventure ready ahead of time. Fire and forget. */
		prepareChild: (childId: string) =>
			call<Record<string, never>>(
				`/children/${encodeURIComponent(childId)}/prepare`,
				{ method: "POST" }
			),
		/** Admins only: sets some of the steps; the engine answers all four. */
		setSteps: (steps: Partial<EngineSteps>) =>
			call<{ steps: EngineSteps }>("/me/steps", {
				body: JSON.stringify(steps),
				headers: { "content-type": "application/json" },
				method: "PUT",
			}),
		/**
		 * One very short, clear sentence that restates the question, for the screen, and whether
		 * the words were a question at all ("Hello, hello" is not).
		 */
		shortQuestion: (question: string) =>
			call<{ isQuestion: boolean; short: string }>("/questions/short", {
				body: JSON.stringify({ question }),
				headers: { "content-type": "application/json" },
				method: "POST",
			}),
		/** Commits a draft in the chosen style. Safe to repeat. */
		startDraft: (id: string, style: Style) =>
			call<{ id: string; source: string; status: string }>(
				`/adventures/${encodeURIComponent(id)}/start`,
				{
					body: JSON.stringify({ style }),
					headers: { "content-type": "application/json" },
					method: "POST",
				}
			),
		visitNode: (id: string, node: string) =>
			call<VisitResult>(
				`/adventures/${encodeURIComponent(id)}/nodes/${encodeURIComponent(node)}/visit`,
				{ method: "POST" }
			),
	};
}

export const sleep = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

/** The wait before the next read when the last one failed. */
export const POLL_FALLBACK_SEC = 3;

/**
 * Reads again every `pollAfterSec` the engine asks for and stops once it says null (every node is
 * ready or failed) or the caller is gone. A failed read is reported and tried again.
 */
export async function pollAdventure<
	T extends { pollAfterSec?: number | null },
>({
	isLive,
	onFailed,
	onRead,
	read,
	sleep: pause,
}: {
	isLive: () => boolean;
	onFailed?: () => void;
	onRead: (adventure: T) => void;
	read: () => Promise<T>;
	sleep: (ms: number) => Promise<void>;
}) {
	while (isLive()) {
		let adventure: T | null = null;
		try {
			// biome-ignore lint/performance/noAwaitInLoops: reads run one after another, by design
			adventure = await read();
		} catch {
			// counted below, then read again
		}
		if (!isLive()) {
			return;
		}
		if (adventure) {
			onRead(adventure);
		} else {
			onFailed?.();
		}
		const next = adventure
			? (adventure.pollAfterSec ?? null)
			: POLL_FALLBACK_SEC;
		if (next === null || !isLive()) {
			return;
		}
		await pause(next * 1000);
	}
}

/**
 * A media url that fails has most likely expired: the first failure runs `reread` for fresh urls.
 * Later failures do nothing, so a file that is truly gone cannot loop.
 */
export function makeExpiryGuard(reread: () => void) {
	let used = false;
	return () => {
		if (used) {
			return;
		}
		used = true;
		reread();
	};
}
