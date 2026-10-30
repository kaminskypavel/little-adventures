// The only module screens import data functions from. Swap the bodies for
// the real backend; the signatures stay.
import {
	finished,
	grownUpList,
	ideas,
	keepGoing,
	mockAdventure,
	transcribedQuestion,
} from "./mock-adventure";
import type {
	Adventure,
	AdventureSummary,
	Idea,
	MakeStatus,
	NodeId,
	Progress,
} from "./types";

/** Dev flag: true makes getHome return empty lists (first-run state). */
export const devFlags: { isFirstHome: boolean } = { isFirstHome: false };

const MAKE_MS = 12_000;
const TICK_MS = 500;

const wait = <T>(value: T): Promise<T> =>
	new Promise((resolve) => {
		setTimeout(() => resolve(value), 100 + Math.random() * 200);
	});

const progressById = new Map<string, Progress>();

const readProgress = (id: string): Progress => {
	let p = progressById.get(id);
	if (!p) {
		p = { here: "intro", visited: ["intro"] };
		progressById.set(id, p);
	}
	return p;
};

export const getHome = (): Promise<{
	keepGoing: AdventureSummary[];
	finished: AdventureSummary[];
}> =>
	wait(
		devFlags.isFirstHome
			? { finished: [], keepGoing: [] }
			: { finished, keepGoing }
	);

export const getIdeas = (): Promise<Idea[]> => wait(ideas);

export const transcribe = (): Promise<string> => wait(transcribedQuestion);

export const startAdventure = (_question: string): Promise<{ id: string }> =>
	wait({ id: mockAdventure.id });

/** Reports "making" until about 12 s have passed, then "ready". Returns unsubscribe. */
export const watchMaking = (
	_id: string,
	onStatus: (s: MakeStatus) => void
): (() => void) => {
	const start = Date.now();
	onStatus({ progress: 0, state: "making" });
	const timer = setInterval(() => {
		const progress = Math.min((Date.now() - start) / MAKE_MS, 1);
		if (progress >= 1) {
			clearInterval(timer);
			onStatus({ state: "ready" });
		} else {
			onStatus({ progress, state: "making" });
		}
	}, TICK_MS);
	return () => clearInterval(timer);
};

export const getAdventure = (_id: string): Promise<Adventure> =>
	wait(mockAdventure);

export const getProgress = (id: string): Promise<Progress> => {
	const p = readProgress(id);
	return wait({ here: p.here, visited: [...p.visited] });
};

export const visit = (id: string, node: NodeId): Promise<Progress> => {
	const p = readProgress(id);
	p.here = node;
	if (!p.visited.includes(node)) {
		p.visited.push(node);
	}
	return wait({ here: p.here, visited: [...p.visited] });
};

export const getAdventures = (): Promise<AdventureSummary[]> =>
	wait(grownUpList);
