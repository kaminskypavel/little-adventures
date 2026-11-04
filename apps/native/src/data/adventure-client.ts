// The only module screens import data functions from. With EXPO_PUBLIC_ENGINE_URL set the
// adventure bodies call the engine; unset, they play the bundled adventure. The profile, photo
// and looks always stay on the app's own server (screens read those through profile-queries.ts).
import { queryOptions } from "@tanstack/react-query";
import { authedFetchTo, isGuestNow } from "@/src/auth/auth-client";
import { ENV } from "@/src/env";
import { type Language, languageNow } from "@/src/i18n";
import { currentChildReady, getCurrentChildId } from "./current-child";
import { withDevQuestions } from "./dev-questions";
import { createDraftStore } from "./draft-store";
import {
	createEngineClient,
	type EngineAdventure,
	type EngineSteps,
	type Style,
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
import { toChild } from "./profile-map";
import { childOptions, grownUpOptions } from "./profile-queries";
import { queryClient } from "./query-client";
import { trpcClient } from "./trpc";
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

/** Admin switches for the paid steps. Only called when the engine said the account is an admin. */
export const setSteps = (steps: Partial<EngineSteps>) => {
	if (!engine) {
		throw new Error("No engine");
	}
	return engine.setSteps(steps);
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
		p = { here: "intro", visited: [] };
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

async function readEngine(
	client: Engine,
	id: string,
	language: Language = languageNow()
) {
	const raw = await client.getAdventure(id, language);
	seedProgress(id, raw);
	return raw;
}

async function progressFor(client: Engine, id: string) {
	return (
		engineProgress.get(id) ?? seedProgress(id, await readEngine(client, id))
	);
}

async function listEngine(
	client: Engine,
	language: Language
): Promise<AdventureSummary[]> {
	const items = await client.listAdventures(language);
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

/**
 * The place as one video for the TV. Null when there is none to send: the bundled adventure, or
 * a place that is not ready yet.
 */
export const castPlace = (id: string, node: NodeId) =>
	engine ? engine.cast(id, node) : Promise.resolve(null);

/** Where to upload the map picture for the TV. Null in the bundled adventure: nothing to send. */
export const castMap = (id: string, contentLength?: number) =>
	engine ? engine.castMap(id, contentLength) : Promise.resolve(null);

export const getHome = async (
	language: Language = languageNow()
): Promise<{
	keepGoing: AdventureSummary[];
	finished: AdventureSummary[];
}> => {
	if (devFlags.isFirstHome) {
		return wait({ finished: [], keepGoing: [] });
	}
	if (!engine) {
		return wait({ finished, keepGoing });
	}
	const list = await listEngine(engine, language);
	return {
		finished: list.filter((s) => s.finished),
		keepGoing: list.filter((s) => !s.finished),
	};
};

export const getIdeas = (): Promise<Idea[]> => wait(ideas);

/**
 * Home's stories in the shared cache, so Home paints the last list at once and reads it again
 * behind it. Unfinished first, then finished. A list that cannot be read shows as none.
 */
export const homeOptions = (language: Language = languageNow()) =>
	queryOptions({
		queryFn: () =>
			getHome(language)
				.then((home) => [...home.keepGoing, ...home.finished])
				.catch((): AdventureSummary[] => []),
		queryKey: ["home", language],
	});

export const ideasOptions = () =>
	queryOptions({ queryFn: getIdeas, queryKey: ["ideas"] });

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
	const { text } = await trpcClient.voice.transcribe.mutate({
		audioBase64: bytesToBase64(wav),
	});
	return text;
};

/**
 * One very short, clear question for the check screen, and whether the words were a question at
 * all. The engine decides both; the bundled sample mode, and any engine miss, uses the transcript
 * trimmed to about 60 characters and counts it as a question.
 */
export const shortQuestion = async (
	question: string
): Promise<{ isQuestion: boolean; short: string }> => {
	const fallback = { isQuestion: true, short: trimQuestion(question) };
	if (!engine) {
		return fallback;
	}
	try {
		const { isQuestion, short } = await engine.shortQuestion(
			question,
			languageNow()
		);
		// An older engine sends no flag: treat that as a question.
		return {
			isQuestion: isQuestion !== false,
			short: short.trim() || fallback.short,
		};
	} catch {
		return fallback;
	}
};

/**
 * Fun facts about the question for the wait, fitted to the child's age. Empty without an engine
 * and on any miss: the loader simply shows none.
 */
export const loaderFacts = async (question: string): Promise<string[]> => {
	if (!engine) {
		return [];
	}
	try {
		const { profile } = await loadChild();
		const { facts } = await engine.loaderFacts(
			question,
			languageNow(),
			profile.childAge ?? undefined
		);
		return Array.isArray(facts) ? facts : [];
	} catch {
		return [];
	}
};

export const startAdventure = async (
	question: string,
	style: Style
): Promise<{ id: string }> => {
	if (!engine) {
		return wait({ id: mockAdventure.id });
	}
	const { id: childId } = await loadChild();
	if (!childId) {
		throw new Error("No child is set up yet");
	}
	const made = await engine.createAdventure(
		childId,
		question,
		style,
		languageNow()
	);
	return { id: made.id };
};

const drafts = engine
	? createDraftStore({
			create: (question, style) => startAdventure(question, style),
			createDraft: async (question) => {
				const { id: childId } = await loadChild();
				if (!childId) {
					throw new Error("No child is set up yet");
				}
				return engine.createDraft(childId, question, languageNow());
			},
			prepare: async () => {
				const { id: childId } = await loadChild();
				if (!childId) {
					throw new Error("No child is set up yet");
				}
				return engine.prepareChild(childId, languageNow());
			},
			sleep,
			start: (id, style) => engine.startDraft(id, style),
		})
	: null;

// The guest never makes an adventure, so nothing is prepared for it: no draft rows pile up on the
// shared account.
/** Starts preparing an adventure for the confirmed question. Returns at once. */
export const beginDraft = (question: string) =>
	isGuestNow() ? undefined : drafts?.beginDraft(question);

/** Gets the child's next adventure ready: once per child per app session, errors ignored. */
export const prepareChild = (childId?: string) =>
	isGuestNow() ? undefined : drafts?.prepareOnce(childId);

/**
 * The language changed: drops the prepared next adventure and prepares it again in the new
 * language for this child.
 */
export const reprepareChild = (childId?: string) =>
	isGuestNow() ? undefined : drafts?.reprepare(childId);

/** Starts the adventure (the prepared one when there is one) and gives its id. */
export const startDrafted = async (input: {
	question: string;
	style: Style;
}): Promise<string> =>
	drafts
		? drafts.startDrafted(input)
		: (await startAdventure(input.question, input.style)).id;

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

export const getAdventure = async (
	id: string,
	language: Language = languageNow()
): Promise<Adventure> => {
	if (!engine) {
		return wait(mockAdventure);
	}
	return withDevQuestions(
		toAdventure(await readEngine(engine, id, language), knownUrls)
	);
};

export const reloadAdventure = (
	id: string,
	language: Language = languageNow()
): Promise<Adventure> => {
	knownUrls.clear();
	return getAdventure(id, language);
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
	engine ? listEngine(engine, languageNow()) : wait(grownUpList);

/** The current child, or the empty profile when there is none yet. */
async function loadChild(): Promise<{ id?: string; profile: Profile }> {
	await currentChildReady();
	// From the shared cache when it is there (read again behind it when stale), so a screen that
	// asks for the child's name paints at once instead of after a round trip.
	const rows = await queryClient.ensureQueryData({
		...childOptions(),
		retry: false,
		revalidateIfStale: true,
	});
	const { id, profile } = toChild(rows, getCurrentChildId());
	return { id, profile };
}

/** The app server refuses every signed-in call of a grown-up outside the private beta. */
const isOutsideBeta = (error: unknown) =>
	(error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

/**
 * Where a signed-in grown-up starts: the private beta screen when they are not in it, else Home
 * (a child is set up) or the first welcome.
 */
export const startRoute = async (): Promise<"/beta" | "/hello" | "/home"> => {
	// Read what the next screens show while the child is read, so they paint from the cache.
	queryClient.prefetchQuery(grownUpOptions());
	queryClient.prefetchQuery(homeOptions());
	queryClient.prefetchQuery(ideasOptions());
	try {
		const { id } = await loadChild();
		return id === undefined ? "/hello" : "/home";
	} catch (error) {
		return isOutsideBeta(error) ? "/beta" : "/hello";
	}
};
