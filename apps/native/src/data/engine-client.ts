// The engine's player API, as the app uses it. Objects and enums are open: unknown fields and
// values are tolerated, so statuses are plain strings here.

/** A stored file: `id` is its storage key (cache by it), `url` is presigned for 2 hours. */
export interface EngineMedia {
	id: string;
	url: string;
}
export interface EngineWord {
	endSec: number;
	startSec: number;
	text: string;
}
export type EngineNarration = EngineMedia & { words: EngineWord[] };
export interface EngineNode {
	/** Null until a clip is made, and when none could be made. */
	clip: EngineMedia | null;
	fact: string | null;
	id: string;
	/** True for goodnight until all 4 places are visited. */
	locked: boolean;
	name: string | null;
	narration: EngineNarration | null;
	neighbours: string[];
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
/** The signed-in account as the engine knows it. `live` is the admin switch for real adventures. */
export interface EngineMe {
	email?: string;
	id: string;
	isAdmin: boolean;
	live: boolean;
	name?: string;
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
		createAdventure: (childId: string, question: string) =>
			call<{ id: string; source: string; status: string }>("/adventures", {
				body: JSON.stringify({ childId, question }),
				headers: { "content-type": "application/json" },
				method: "POST",
			}),
		getAdventure: (id: string) =>
			call<EngineAdventure>(`/adventures/${encodeURIComponent(id)}`),
		getMe: () => call<EngineMe>("/me"),
		listAdventures: async () =>
			(await call<{ items: EngineSummary[] }>("/adventures")).items,
		/** Admins only: the engine answers 403 for anyone else. */
		setLive: (on: boolean) =>
			call<{ live: boolean }>("/me/live", {
				body: JSON.stringify({ on }),
				headers: { "content-type": "application/json" },
				method: "PUT",
			}),
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
