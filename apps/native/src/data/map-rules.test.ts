import { describe, expect, test } from "bun:test";
import {
	choicesFrom,
	isGoodnightOpen,
	missingPlaces,
	neighbours,
} from "./map-rules";
import type { NodeId } from "./types";

const all: NodeId[] = ["intro", "p1", "p2", "p1a", "p2a"];

describe("neighbours", () => {
	test.each([
		["intro", ["p1", "p2"]],
		["p1", ["p1a", "p2"]],
		["p2", ["p2a", "p1"]],
		["p1a", ["p2", "outro"]],
		["p2a", ["p1", "outro"]],
	] as [NodeId, NodeId[]][])("%s", (node, expected) => {
		expect(neighbours(node)).toEqual(expected);
	});

	test("never offers intro", () => {
		for (const n of all) {
			expect(neighbours(n)).not.toContain("intro");
		}
	});
});

describe("goodnight unlock", () => {
	test("locked before all four places", () => {
		expect(isGoodnightOpen(["intro", "p1", "p2", "p1a"])).toBe(false);
		expect(missingPlaces(["intro", "p1", "p2", "p1a"])).toBe(1);
		expect(missingPlaces(["intro"])).toBe(4);
	});

	test("open after all four", () => {
		expect(isGoodnightOpen(all)).toBe(true);
		expect(missingPlaces(all)).toBe(0);
	});
});

describe("choicesFrom", () => {
	test("outro locked until open", () => {
		expect(choicesFrom("p1a", ["intro", "p1", "p1a"])).toEqual([
			{ locked: false, node: "p2" },
			{ locked: true, node: "outro" },
		]);
	});

	test("outro unlocked after 4", () => {
		expect(choicesFrom("p2a", all)).toEqual([
			{ locked: false, node: "p1" },
			{ locked: false, node: "outro" },
		]);
	});
});
