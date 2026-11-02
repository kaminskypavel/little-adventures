import { describe, expect, test } from "bun:test";
import { dottedRoads, litRoads, pathBetween } from "./fork-roads";

describe("litRoads", () => {
	test("at the start nothing is lit", () => {
		expect([...litRoads(["intro"])]).toEqual([]);
	});

	test("after two places only the road walked is lit", () => {
		expect([...litRoads(["intro", "p1", "p2"])].sort()).toEqual([
			"intro-p1",
			"p1-p2",
		]);
	});

	test("at the goodnight every road is lit", () => {
		const all = ["intro", "p1", "p2", "p1a", "p2a", "outro"] as const;
		expect(litRoads(all).size).toBe(8);
	});
});

describe("dottedRoads", () => {
	test("from the intro both lanes", () => {
		expect([...dottedRoads("intro", ["p1", "p2"], ["intro"])].sort()).toEqual([
			"intro-p1",
			"intro-p2",
		]);
	});

	test("the next place in the lane", () => {
		const visited = ["intro", "p1", "p2"] as const;
		expect([...dottedRoads("p2", ["p2a"], visited)]).toEqual(["p2-p2a"]);
	});
});

describe("pathBetween", () => {
	test("a cross over goes by walked ground", () => {
		const visited = ["intro", "p1", "p1a"] as const;
		expect(pathBetween("p1a", "p2", visited)).toEqual(["p1a", "p1", "p2"]);
	});

	test("the goodnight is only ever the last stop", () => {
		const path = pathBetween("p1", "p2a", ["intro", "p1"]);
		expect(path).not.toContain("outro");
	});

	test("the same place is no walk", () => {
		expect(pathBetween("p1", "p1", ["intro", "p1"])).toEqual(["p1"]);
	});
});
