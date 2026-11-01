// The only module screens import data functions from. With EXPO_PUBLIC_ENGINE_URL set the
// adventure bodies call the engine; unset, they play the bundled adventure. The profile, photo
// and looks always stay on the app's own server.
import { authedFetchTo } from "@/src/auth/auth-client";
import { ENV } from "@/src/env";
import {
	createEngineClient,
	type EngineAdventure,
	sleep,
} from "./engine-client";
import {
	type KnownUrls,
	progressOf,
	toAdventure,
	toSummary,
	watchIntro,
} from "./engine-map";
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
	MakeStatus,
	NodeId,
	Profile,
	Progress,
} from "./types";
import { hasAudio, trimQuestion } from "./voice-rules";
import { bytesToBase64 } from "./wav";

const ENGINE_URL = ENV.EXPO_PUBLIC_ENGINE_URL?.replace(/\/$/u, "");
const engine = ENGINE_URL
	? createEngineClient(authedFetchTo(`${ENGINE_URL}/api/v1`))
	: null;
type Engine = NonNullable<typeof engine>;

export const usesEngine = engine !== null;

/** The engine's view of the signed-in account; null in the bundled sample mode. */
export const getMe = () => (engine ? engine.getMe() : Promise.resolve(null));

/** Admin switch for real adventures. Only called when the engine said the account is an admin. */
export const setLive = (on: boolean) => {
	if (!engine) {
		throw new Error("No engine");
	}
	return engine.setLive(on);
};

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

// The engine side. Urls are kept by file, so a fresh read never swaps a file that is playing.
const knownUrls: KnownUrls = new Map();
const engineProgress = new Map<string, Progress>();

const seedProgress = (id: string, raw: EngineAdventure): Progress => {
	const known = engineProgress.get(id) ?? progressOf(raw);
	engineProgress.set(id, known);
	return known;
};

async function readEngine(client: Engine, id: string) {
	const raw = await client.getAdventure(id);
	seedProgress(id, raw);
	return raw;
}

async function progressFor(client: Engine, id: string) {
	return (
		engineProgress.get(id) ?? seedProgress(id, await readEngine(client, id))
	);
}

async function listEngine(client: Engine): Promise<AdventureSummary[]> {
	const items = await client.listAdventures();
	return items
		.filter((item) => item.status !== "failed")
		.map((item) => toSummary(item, knownUrls));
}

const watchEngine = (
	client: Engine,
	id: string,
	onStatus: (s: MakeStatus) => void
): (() => void) =>
	watchIntro({
		after: (fn, ms) => {
			const timer = setTimeout(fn, ms);
			return () => clearTimeout(timer);
		},
		now: Date.now,
		onStatus,
		read: () => readEngine(client, id),
		sleep,
	});

async function visitEngine(client: Engine, id: string, node: NodeId) {
	const p = await progressFor(client, id);
	p.here = node;
	if (!p.visited.includes(node)) {
		p.visited.push(node);
	}
	try {
		p.outroLocked = (await client.visitNode(id, node)).outroLocked;
	} catch {
		// A visit that did not reach the engine never holds the child up: the screens fall back
		// to the local goodnight rule rather than a lock that was true before.
		p.outroLocked = undefined;
	}
	return { ...p, visited: [...p.visited] };
}

export const getHome = async (): Promise<{
	keepGoing: AdventureSummary[];
	finished: AdventureSummary[];
}> => {
	if (devFlags.isFirstHome) {
		return wait({ finished: [], keepGoing: [] });
	}
	if (!engine) {
		return wait({ finished, keepGoing });
	}
	const list = await listEngine(engine);
	return {
		finished: list.filter((s) => s.finished),
		keepGoing: list.filter((s) => !s.finished),
	};
};

/** The adventure made last, for Home's "Keep exploring" card. The engine lists newest first. */
export const getLatestAdventure =
	async (): Promise<AdventureSummary | null> => {
		if (devFlags.isFirstHome) {
			return null;
		}
		const list = engine ? await listEngine(engine) : await wait(keepGoing);
		return list[0] ?? null;
	};

/**
 * The clay picture drawn of the child; null until one is drawn. Never indexed by the saved
 * look: a child saved earlier may still say "felt", and only the clay drawing is made now.
 */
export const getAvatarUrl = async (): Promise<string | null> => {
	const [row] = await trpc.child.mine.query();
	return row?.drawingUrls.clay ?? null;
};

export const getIdeas = (): Promise<Idea[]> => wait(ideas);

/**
 * A spoken question (WAV bytes) as text. With the bundled adventure the canned question comes
 * back, as it always did. With the engine an empty recording is never sent and gives "".
 */
export const transcribe = async (wav: Uint8Array): Promise<string> => {
	if (!engine) {
		return wait(transcribedQuestion);
	}
	if (!hasAudio(wav)) {
		return "";
	}
	const { text } = await trpc.voice.transcribe.mutate({
		audioBase64: bytesToBase64(wav),
	});
	return text;
};

/**
 * One very short, clear question for the check screen. The engine writes it; the bundled sample
 * mode, and any engine miss, uses the transcript trimmed to about 60 characters.
 */
export const shortQuestion = async (question: string): Promise<string> => {
	if (!engine) {
		return trimQuestion(question);
	}
	try {
		const { short } = await engine.shortQuestion(question);
		return short.trim() || trimQuestion(question);
	} catch {
		return trimQuestion(question);
	}
};

export const startAdventure = async (
	question: string
): Promise<{ id: string }> => {
	if (!engine) {
		return wait({ id: mockAdventure.id });
	}
	const { id: childId } = await loadChild();
	if (!childId) {
		throw new Error("No child is set up yet");
	}
	const made = await engine.createAdventure(childId, question);
	return { id: made.id };
};

/**
 * Reports "making" until about 12 s have passed, then "ready". Returns unsubscribe. With the
 * engine it follows the engine's own status and ends when the intro is ready, or fails at the
 * wait ceiling or after several failed reads in a row.
 */
export const watchMaking = (
	id: string,
	onStatus: (s: MakeStatus) => void
): (() => void) => {
	if (engine) {
		return watchEngine(engine, id, onStatus);
	}
	const goalName = mockAdventure.endGoal.name;
	const start = Date.now();
	onStatus({ goalName, progress: 0, state: "making" });
	const timer = setInterval(() => {
		const progress = Math.min((Date.now() - start) / MAKE_MS, 1);
		if (progress >= 1) {
			clearInterval(timer);
			onStatus({ goalName, state: "ready" });
		} else {
			onStatus({ goalName, progress, state: "making" });
		}
	}, TICK_MS);
	return () => clearInterval(timer);
};

export const getAdventure = async (id: string): Promise<Adventure> => {
	if (!engine) {
		return wait(mockAdventure);
	}
	return toAdventure(await readEngine(engine, id), knownUrls);
};

export const reloadAdventure = (id: string): Promise<Adventure> => {
	knownUrls.clear();
	return getAdventure(id);
};

export const getProgress = async (id: string): Promise<Progress> => {
	if (engine) {
		const p = await progressFor(engine, id);
		return { ...p, visited: [...p.visited] };
	}
	const p = readProgress(id);
	return wait({ here: p.here, visited: [...p.visited] });
};

export const visit = (id: string, node: NodeId): Promise<Progress> => {
	if (engine) {
		return visitEngine(engine, id, node);
	}
	const p = readProgress(id);
	p.here = node;
	if (!p.visited.includes(node)) {
		p.visited.push(node);
	}
	return wait({ here: p.here, visited: [...p.visited] });
};

export const getAdventures = (): Promise<AdventureSummary[]> =>
	engine ? listEngine(engine) : wait(grownUpList);

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
			// A child saved earlier may still say "felt"; only clay is drawn now.
			look: "clay",
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

/** The grown-up's own photo (signed url), or null when none is saved. */
export const getGrownUpPhoto = async (): Promise<{
	photoUrl: string;
} | null> => {
	const row = await trpc.grownUp.mine.query();
	return row ? { photoUrl: row.photoUrl } : null;
};

export const saveGrownUpPhoto = async (photoKey: string): Promise<void> => {
	await trpc.grownUp.save.mutate({ photoKey });
};

export const deleteGrownUpPhoto = async (): Promise<void> => {
	await trpc.grownUp.delete.mutate();
};
