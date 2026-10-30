// The only module screens import data functions from. Swap the bodies for
// the real backend; the signatures stay.
import {
	finished,
	grownUpList,
	ideas,
	keepGoing,
	mockAdventure,
	mockProfile,
	transcribedQuestion,
} from "./mock-adventure";
import type {
	Adventure,
	AdventureSummary,
	Idea,
	MakeStatus,
	NodeId,
	Profile,
	Progress,
} from "./types";

/**
 * Dev flags for the mock. isFirstHome: getHome returns empty lists (E4).
 * firstRun: the app starts on Welcome.
 */
export const devFlags: { firstRun: boolean; isFirstHome: boolean } = {
	firstRun: true,
	isFirstHome: false,
};

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

let profile: Profile = { ...mockProfile };

/** The child set up on first run (name, boy or girl, age, look, who comes along). */
export const getProfile = (): Promise<Profile> => wait({ ...profile });

export const saveProfile = (patch: Partial<Profile>): Promise<Profile> => {
	profile = { ...profile, ...patch };
	return wait({ ...profile });
};

/** True when a child exists (name and age set). The dev flag `firstRun` forces false for the mock. */
export const isSetUp = (): Promise<boolean> =>
	wait(
		!devFlags.firstRun && profile.childName !== "" && profile.childAge !== null
	);
