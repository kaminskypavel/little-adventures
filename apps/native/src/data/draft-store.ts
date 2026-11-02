// A head start for an adventure: the question is sent to the engine as soon as it is confirmed,
// and the style screen's Start commits it. Anything that goes wrong falls back to the single
// create call, so a draft never holds the child up. Plain module state, no React.
import { EngineError, type Style } from "./engine-client";

export interface DraftApi {
	/** The single call that creates and starts an adventure. */
	create: (question: string, style: Style) => Promise<{ id: string }>;
	createDraft: (question: string) => Promise<{ id: string }>;
	prepare: () => Promise<unknown>;
	sleep: (ms: number) => Promise<void>;
	start: (id: string, style: Style) => Promise<unknown>;
}

const RETRY_MS = 1000;

/** The draft is gone (missing or failed) or no longer allowed: the usual create call takes over. */
const isGone = (error: unknown) =>
	error instanceof EngineError &&
	(error.status === 403 || error.status === 404 || error.status === 409);

export function createDraftStore(api: DraftApi) {
	// Null when the draft request failed: Start then creates as before.
	const drafts = new Map<string, Promise<string | null>>();
	// One start per question, shared by repeat taps, until the question is asked again.
	const starts = new Map<string, Promise<string>>();
	let prepared = false;

	// Start is safe to repeat, so a server error or a dropped connection gets one more try. Create
	// is never called after a start that may have gone through.
	const start = async (id: string, style: Style) => {
		try {
			await api.start(id, style);
		} catch (error) {
			if (isGone(error)) {
				throw error;
			}
			await api.sleep(RETRY_MS);
			await api.start(id, style);
		}
	};

	const commit = async (question: string, style: Style): Promise<string> => {
		const id = await drafts.get(question);
		if (id) {
			try {
				await start(id, style);
				return id;
			} catch (error) {
				if (!isGone(error)) {
					throw error;
				}
			}
		}
		return (await api.create(question, style)).id;
	};

	return {
		/** Fire the draft request now; returns at once. */
		beginDraft(question: string) {
			starts.delete(question);
			drafts.set(
				question,
				api
					.createDraft(question)
					.then((made) => made.id)
					.catch(() => null)
			);
		},
		/** Once per app session; errors are ignored and a miss lets the next call try again. */
		prepareOnce() {
			if (prepared) {
				return;
			}
			prepared = true;
			api.prepare().catch(() => {
				prepared = false;
			});
		},
		startDrafted({ question, style }: { question: string; style: Style }) {
			const known = starts.get(question);
			if (known) {
				return known;
			}
			const pending = commit(question, style);
			starts.set(question, pending);
			pending.catch(() => starts.delete(question));
			return pending;
		},
	};
}
