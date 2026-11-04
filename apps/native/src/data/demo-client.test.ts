import { describe, expect, test } from "bun:test";
import {
	FRESH_PROGRESS,
	parseAdventure,
	parseIndex,
	stepProgress,
	toDemoSummary,
} from "./demo-client";
import { toAdventure } from "./engine-map";
import { isOutroLocked } from "./map-rules";
import type { NodeId } from "./types";

const throws = (fn: () => unknown) => {
	try {
		fn();
		return false;
	} catch {
		return true;
	}
};

const index = {
	adventures: [
		{
			child: { age: 2, kind: "girl", name: "Sunny" },
			cover: { url: "https://cdn.test/demo/v1/a/cover.png" },
			id: "a",
			placesDone: 4,
			question: "How do bees make honey?",
			title: "Sunny Finds Honey",
		},
		{ title: "no id, dropped" },
		{ id: "b", question: "How was pizza invented?" },
	],
	version: 1,
};

const node = (id: string) => ({
	clip: null,
	fact: `fact ${id}`,
	id,
	locked: false,
	name: `Name ${id}`,
	narration: null,
	neighbours: [],
	picture: { id: `${id}.png`, url: `https://cdn.test/${id}.png` },
	status: "ready",
	visited: true,
});

const file = {
	endGoal: { closed: null, name: "Honey", open: null },
	id: "a",
	music: { url: "https://cdn.test/music.mp3" },
	nodes: ["intro", "p1", "p2", "p1a", "p2a", "outro"].map(node),
	pollAfterSec: 30,
	question: "How do bees make honey?",
	source: "recorded",
	status: "ready",
	title: "Sunny Finds Honey",
};

describe("demo index", () => {
	test("reads the entries and drops one with no id", () => {
		const entries = parseIndex(index);
		expect(entries.map((e) => e.id)).toEqual(["a", "b"]);
		expect(entries[0]?.child).toEqual({ age: 2, kind: "girl", name: "Sunny" });
		expect(entries[0]?.cover).toBe("https://cdn.test/demo/v1/a/cover.png");
	});
	test("a sparse entry reads empty, the title falls back to the question", () => {
		const [, b] = parseIndex(index);
		expect(b?.title).toBe("How was pizza invented?");
		expect(b?.cover).toBe(null);
		expect(b?.child.name).toBe("");
	});
	test("anything that is not an index reads as none", () => {
		expect(parseIndex(null)).toEqual([]);
		expect(parseIndex({ adventures: "x" })).toEqual([]);
	});
	test("a summary lights the places done and carries the cover", () => {
		const summary = toDemoSummary(parseIndex(index)[0] as never);
		expect([summary.partsDone, summary.partsTotal, summary.title]).toEqual([
			4,
			4,
			"Sunny Finds Honey",
		]);
		expect(summary.picture).toEqual({
			cacheKey: "https://cdn.test/demo/v1/a/cover.png",
			uri: "https://cdn.test/demo/v1/a/cover.png",
		});
	});
});

describe("demo adventure", () => {
	test("maps onto the app's adventure and is never polled again", () => {
		const adventure = toAdventure(parseAdventure(file), new Map());
		expect(adventure.pollAfterSec).toBe(null);
		expect(adventure.places.p1.name).toBe("Name p1");
		expect(adventure.places.p1.status).toBe("ready");
		expect(adventure.music?.url).toBe("https://cdn.test/music.mp3");
	});
	test("a file that is not an adventure is refused", () => {
		expect(throws(() => parseAdventure({ id: "a" }))).toBe(true);
		expect(throws(() => parseAdventure(null))).toBe(true);
	});
});

describe("local visits", () => {
	test("a demo starts with only the intro open", () => {
		expect(FRESH_PROGRESS).toEqual({ here: "intro", visited: [] });
	});
	test("a visit moves the child and never repeats a place", () => {
		const one = stepProgress(FRESH_PROGRESS, "intro");
		const two = stepProgress(stepProgress(one, "p1"), "p1");
		expect(two).toEqual({ here: "p1", visited: ["intro", "p1"] });
		expect(FRESH_PROGRESS.visited).toEqual([]);
	});
	test("the goodnight unlocks only after all four places", () => {
		let p = stepProgress(undefined, "intro");
		for (const place of ["p1", "p2", "p1a"] as NodeId[]) {
			p = stepProgress(p, place);
			expect(isOutroLocked(p)).toBe(true);
		}
		p = stepProgress(p, "p2a");
		expect(isOutroLocked(p)).toBe(false);
	});
});
