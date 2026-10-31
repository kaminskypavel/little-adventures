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
import { trpc } from "./trpc";
import type {
	Adventure,
	AdventureSummary,
	Idea,
	Look,
	MakeStatus,
	NodeId,
	Profile,
	Progress,
} from "./types";

/** Dev flag for the mock. isFirstHome: getHome returns empty lists (E4). */
export const devFlags: { isFirstHome: boolean } = {
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

const emptyProfile: Profile = {
	artStatus: "idle",
	childAge: null,
	childKind: "boy",
	childName: "",
	grownUp: false,
	hasPhoto: false,
	look: "clay",
	puppy: false,
};

// Name, kind and age are saved together by screen 03; until then the answers wait here.
let draft: Profile = { ...emptyProfile };

/** The caller's first child, or the draft when there is none yet. */
async function loadChild(): Promise<{ id?: string; profile: Profile }> {
	const [row] = await trpc.child.mine.query();
	if (!row) {
		return { profile: { ...draft } };
	}
	draft = { ...emptyProfile };
	return {
		id: row.id,
		profile: {
			artStatus: row.artStatus,
			childAge: row.age,
			childKind: row.kind,
			childName: row.name,
			faceUrl: row.faceUrl ?? undefined,
			grownUp: row.grownUp,
			hasPhoto: row.photoKey !== null,
			look: row.look as Look,
			photoKey: row.photoKey ?? undefined,
			puppy: row.puppy,
		},
	};
}

/** The child set up on first run (name, boy or girl, age, look, who comes along). */
export const getProfile = async (): Promise<Profile> =>
	(await loadChild()).profile;

export const saveProfile = async (
	patch: Partial<Profile>
): Promise<Profile> => {
	const { id, profile } = await loadChild();
	const merged = { ...profile, ...patch };
	if (!id) {
		draft = merged;
	}
	if (merged.childName.trim() === "" || merged.childAge === null) {
		return merged;
	}
	await trpc.child.save.mutate({
		age: merged.childAge,
		grownUp: merged.grownUp,
		id,
		kind: merged.childKind,
		look: merged.look,
		name: merged.childName,
		photoKey: merged.photoKey,
		puppy: merged.puppy,
	});
	return merged;
};

/** True when the grown-up has a child. */
export const isSetUp = async (): Promise<boolean> => {
	try {
		const { id } = await loadChild();
		return id !== undefined;
	} catch {
		return false;
	}
};

/** Deletes the stored photo of the current child and returns the refreshed profile. */
export const deleteChildPhoto = async (): Promise<Profile> => {
	const { id } = await loadChild();
	if (id) {
		await trpc.photo.delete.mutate({ childId: id });
	}
	return (await loadChild()).profile;
};
