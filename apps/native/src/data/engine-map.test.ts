import { describe, expect, test } from "bun:test";
import type { EngineAdventure, EngineNode } from "./engine-client";
import {
	initialWait,
	MAX_FAILED_READS,
	makeStatusOf,
	nextWait,
	placeStatus,
	progressOf,
	toAdventure,
	toSummary,
	WAIT_CEILING_MS,
	watchIntro,
} from "./engine-map";
import type { MakeStatus } from "./types";

const media = (id: string, url = `https://files.test/${id}?sig=1`) => ({
	id,
	url,
});

const node = (id: string, patch: Partial<EngineNode> = {}): EngineNode => ({
	clip: null,
	fact: null,
	id,
	locked: false,
	name: `${id} name`,
	narration: null,
	neighbours: [],
	picture: media(`${id}-picture`),
	status: "ready",
	visited: false,
	...patch,
});

const IDS = ["intro", "p1", "p2", "p1a", "p2a", "outro"];

const adventure = (patch: Partial<EngineAdventure> = {}): EngineAdventure => ({
	endGoal: {
		closed: media("gate"),
		name: "Goodnight moon",
		open: media("gate-open"),
	},
	id: "a1",
	nodes: IDS.map((id) => node(id)),
	pollAfterSec: null,
	question: "Why do whales sing?",
	source: "live",
	status: "ready",
	title: "The Song Below",
	...patch,
});

describe("placeStatus", () => {
	test.each([
		["ready", true, "ready"],
		["ready", false, "ready"],
		["waiting", true, "drawing"],
		["making", true, "drawing"],
		["failed", true, "drawing"],
		["something-new", true, "drawing"],
	] as [string, boolean, string][])(
		"%s while polling=%s reads %s",
		(status, polling, expected) => {
			expect(placeStatus(status, polling)).toBe(expected);
		}
	);

	test("once polling has stopped nothing stays drawing", () => {
		expect(placeStatus("failed", false)).toBe("ready");
		expect(placeStatus("something-new", false)).toBe("ready");
	});
});

describe("toAdventure", () => {
	test("carries the adventure's own question, title, goal and poll interval", () => {
		const a = toAdventure(adventure({ pollAfterSec: 3 }), new Map());
		expect(a.question).toBe("Why do whales sing?");
		expect(a.title).toBe("The Song Below");
		expect(a.endGoal.name).toBe("Goodnight moon");
		expect(a.pollAfterSec).toBe(3);
	});

	test("nodes still being made read as drawing while the adventure polls", () => {
		const raw = adventure({
			nodes: IDS.map((id) => node(id, id === "p2" ? { status: "making" } : {})),
			pollAfterSec: 3,
		});
		const a = toAdventure(raw, new Map());
		expect(a.places.p2.status).toBe("drawing");
		expect(a.places.p1.status).toBe("ready");
	});

	test("a recorded node (a clip, no parts) plays as one playable part", () => {
		const raw = adventure({
			nodes: IDS.map((id) =>
				node(
					id,
					id === "p1"
						? {
								clip: media("p1-clip", "https://files.test/c"),
								parts: null,
							}
						: {}
				)
			),
		});
		const a = toAdventure(raw, new Map());
		expect(a.places.p1.parts).toEqual([
			{ id: "p1-clip", status: "playable", url: "https://files.test/c" },
		]);
		expect(a.places.p2.parts).toEqual([]);
	});

	test("a node made in parts carries each part with its own status", () => {
		const raw = adventure({
			nodes: IDS.map((id) =>
				node(
					id,
					id === "p1"
						? {
								parts: [
									{
										id: "p1-a",
										status: "playable",
										video: media("p1-a-file", "https://files.test/a"),
									},
									{ id: "p1-b", status: "making", video: null },
								],
							}
						: {}
				)
			),
		});
		const a = toAdventure(raw, new Map());
		expect(a.places.p1.parts).toEqual([
			{ id: "p1-a", status: "playable", url: "https://files.test/a" },
			{ id: "p1-b", status: "making", url: null },
		]);
	});

	test("an unknown part status reads as making and carries no url", () => {
		const part = {
			id: "p1-a",
			status: "queued",
			video: media("p1-a-file"),
		};
		const raw = adventure({
			nodes: IDS.map((id) => node(id, id === "p1" ? { parts: [part] } : {})),
		});
		expect(toAdventure(raw, new Map()).places.p1.parts).toEqual([
			{ id: "p1-a", status: "making", url: null },
		]);
	});

	test("a later read that makes part 2 playable keeps part 1's url, even when it is signed again", () => {
		const urls = new Map<string, string>();
		const read = (second: boolean, sig: number) =>
			toAdventure(
				adventure({
					nodes: IDS.map((id) =>
						node(
							id,
							id === "p1"
								? {
										parts: [
											{
												id: "p1-a",
												status: "playable",
												video: media(
													"p1-a-file",
													`https://files.test/a?sig=${sig}`
												),
											},
											{
												id: "p1-b",
												status: second ? "playable" : "making",
												video: second
													? media(
															"p1-b-file",
															`https://files.test/b?sig=${sig}`
														)
													: null,
											},
										],
									}
								: {}
						)
					),
				}),
				urls
			);
		const first = read(false, 1);
		const later = read(true, 2);
		expect(first.places.p1.parts[0]?.url).toBe("https://files.test/a?sig=1");
		expect(later.places.p1.parts[0]?.url).toBe("https://files.test/a?sig=1");
		expect(later.places.p1.parts[1]).toEqual({
			id: "p1-b",
			status: "playable",
			url: "https://files.test/b?sig=2",
		});
	});

	test("narration gives the audio url, its word timings and the words to read", () => {
		const words = [
			{ endSec: 0.4, startSec: 0, text: "Whales" },
			{ endSec: 0.9, startSec: 0.5, text: "sing" },
		];
		const raw = adventure({
			nodes: IDS.map((id) =>
				node(
					id,
					id === "p1" ? { narration: { ...media("p1-voice"), words } } : {}
				)
			),
		});
		const place = toAdventure(raw, new Map()).places.p1;
		expect(place.audio?.words).toEqual(words);
		expect(place.narration).toEqual(["Whales", "sing"]);
	});

	test("pictures are cached by their storage key", () => {
		const a = toAdventure(adventure(), new Map());
		expect(a.places.p1.picture).toEqual({
			cacheKey: "p1-picture",
			uri: "https://files.test/p1-picture?sig=1",
		});
	});

	test("a read keeps the urls it has seen, so polling never restarts playback", () => {
		const urls = new Map<string, string>();
		toAdventure(adventure(), urls);
		const later = toAdventure(
			adventure({
				nodes: IDS.map((id) =>
					node(id, {
						picture: media(`${id}-picture`, "https://files.test/new"),
					})
				),
			}),
			urls
		);
		expect(later.places.p1.picture).toEqual({
			cacheKey: "p1-picture",
			uri: "https://files.test/p1-picture?sig=1",
		});
	});

	test("a node the engine has not sent yet reads as drawing and empty", () => {
		const a = toAdventure(adventure({ nodes: [], pollAfterSec: 3 }), new Map());
		expect(a.places.p1.status).toBe("drawing");
		expect(a.places.p1.picture).toBe(null);
		expect(a.places.p1.name).toBe("");
	});

	test("a goal that is not named or drawn yet has an empty name and no pictures", () => {
		const a = toAdventure(
			adventure({ endGoal: { closed: null, name: null, open: null } }),
			new Map()
		);
		expect(a.endGoal).toEqual({ closed: null, name: "", open: null });
	});
});

describe("makeStatusOf", () => {
	test("a failed adventure fails the wait", () => {
		expect(makeStatusOf(adventure({ status: "failed" }))).toEqual({
			state: "failed",
		});
	});

	test("the wait ends when the intro is ready, with the goal's name", () => {
		const raw = adventure({
			nodes: IDS.map((id) => node(id, id === "p1" ? { status: "making" } : {})),
		});
		expect(makeStatusOf(raw)).toEqual({
			goalName: "Goodnight moon",
			state: "ready",
		});
	});

	test("the status line follows the engine: writing, making, intro in the making", () => {
		const notReady = (intro: string, status: string) =>
			adventure({
				endGoal: { closed: null, name: null, open: null },
				nodes: IDS.map((id) =>
					node(id, { status: id === "intro" ? intro : "waiting" })
				),
				status,
			});
		expect(makeStatusOf(notReady("waiting", "writing"))).toEqual({
			goalName: undefined,
			progress: 0,
			stage: 0,
			state: "making",
		});
		expect(makeStatusOf(notReady("waiting", "making"))).toEqual({
			goalName: undefined,
			progress: 0,
			stage: 1,
			state: "making",
		});
		expect(makeStatusOf(notReady("making", "making"))).toEqual({
			goalName: undefined,
			progress: 0,
			stage: 2,
			state: "making",
		});
	});

	test("the goal's name is passed on as soon as it exists", () => {
		const raw = adventure({
			nodes: IDS.map((id) => node(id, { status: "waiting" })),
			status: "making",
		});
		expect(makeStatusOf(raw)).toEqual({
			goalName: "Goodnight moon",
			progress: 0,
			stage: 1,
			state: "making",
		});
	});
});

describe("progressOf", () => {
	test("the intro counts as walked, the rest as the engine says", () => {
		const raw = adventure({
			nodes: IDS.map((id) => node(id, { visited: id === "p2" })),
		});
		expect(progressOf(raw)).toEqual({
			here: "p2",
			outroLocked: false,
			visited: ["intro", "p2"],
		});
	});

	test("goodnight's lock comes from the engine", () => {
		const raw = adventure({
			nodes: IDS.map((id) => node(id, { locked: id === "outro" })),
		});
		expect(progressOf(raw).outroLocked).toBe(true);
	});

	test("with nothing walked the child is at the intro", () => {
		expect(progressOf(adventure()).here).toBe("intro");
	});
});

describe("toSummary", () => {
	const item = {
		cover: media("cover"),
		id: "a1",
		placesDone: 2,
		question: "Why do whales sing?",
		source: "live",
		status: "ready",
		title: null,
	};

	test("an adventure in progress shows its places and falls back to its question", () => {
		const s = toSummary(item);
		expect(s.finished).toBe(false);
		expect(s.partsDone).toBe(2);
		expect(s.partsTotal).toBe(4);
		expect(s.title).toBe("Why do whales sing?");
	});

	test("all 4 places make it finished", () => {
		expect(toSummary({ ...item, placesDone: 4 }).finished).toBe(true);
	});
});

describe("the wait", () => {
	const START = 1_000_000;

	test("keeps waiting while reads work and the ceiling is far", () => {
		const next = nextWait(initialWait(START), "ok", START + 1000);
		expect(next.giveUp).toBe(false);
	});

	test("gives up at the ceiling", () => {
		const before = nextWait(
			initialWait(START),
			"ok",
			START + WAIT_CEILING_MS - 1
		);
		const at = nextWait(initialWait(START), "ok", START + WAIT_CEILING_MS);
		expect(before.giveUp).toBe(false);
		expect(at.giveUp).toBe(true);
	});

	test("gives up after several failed reads in a row", () => {
		let state = initialWait(START);
		for (let n = 1; n < MAX_FAILED_READS; n += 1) {
			state = nextWait(state, "failed", START + n);
			expect(state.giveUp).toBe(false);
		}
		expect(nextWait(state, "failed", START + MAX_FAILED_READS).giveUp).toBe(
			true
		);
	});

	test("a good read in between starts the count again", () => {
		let state = initialWait(START);
		for (let n = 1; n < MAX_FAILED_READS; n += 1) {
			state = nextWait(state, "failed", START + n);
		}
		state = nextWait(state, "ok", START + MAX_FAILED_READS);
		state = nextWait(state, "failed", START + MAX_FAILED_READS + 1);
		expect(state.giveUp).toBe(false);
	});
});

describe("watchIntro", () => {
	const flush = () =>
		new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
	const making = adventure({
		nodes: IDS.map((id) => node(id, { status: "making" })),
		pollAfterSec: 1,
		status: "making",
	});

	const setup = (read: () => Promise<EngineAdventure>, now = () => 0) => {
		const seen: MakeStatus[] = [];
		const timers: (() => void)[] = [];
		let cancelled = 0;
		const stop = watchIntro({
			after: (fn) => {
				timers.push(fn);
				return () => {
					cancelled += 1;
				};
			},
			now,
			onStatus: (status) => seen.push(status),
			read,
			sleep: () => Promise.resolve(),
		});
		return { cancelled: () => cancelled, seen, stop, timers };
	};

	test("four failed reads in a row give one failed", async () => {
		let reads = 0;
		const { seen } = setup(() => {
			reads += 1;
			return Promise.reject(new Error("down"));
		});
		await flush();
		expect(reads).toBe(MAX_FAILED_READS);
		expect(seen.map((s) => s.state)).toEqual(["making", "failed"]);
	});

	test("a clock past the ceiling gives failed", async () => {
		let t = 0;
		const { seen } = setup(
			() => {
				t += WAIT_CEILING_MS;
				return Promise.resolve(making);
			},
			() => t
		);
		await flush();
		expect(seen.map((s) => s.state)).toEqual(["making", "failed"]);
	});

	test("the ceiling timer ends a read that hangs", async () => {
		const { seen, timers } = setup(() => new Promise(() => undefined));
		await flush();
		timers[0]();
		expect(seen.map((s) => s.state)).toEqual(["making", "failed"]);
	});

	test("a ready intro gives one ready and no more reads", async () => {
		let reads = 0;
		const { cancelled, seen } = setup(() => {
			reads += 1;
			return Promise.resolve(adventure());
		});
		await flush();
		expect(reads).toBe(1);
		expect(seen.map((s) => s.state)).toEqual(["making", "ready"]);
		expect(cancelled()).toBe(1);
	});

	test("unsubscribe stops the callbacks", async () => {
		let release: (a: EngineAdventure) => void = () => undefined;
		const { cancelled, seen, stop, timers } = setup(
			() =>
				new Promise((resolve) => {
					release = resolve;
				})
		);
		stop();
		release(adventure());
		await flush();
		timers[0]();
		expect(seen.map((s) => s.state)).toEqual(["making"]);
		expect(cancelled()).toBe(1);
	});
});
