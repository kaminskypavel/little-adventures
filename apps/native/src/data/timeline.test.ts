import { test as bunTest, describe, expect } from "bun:test";
import {
	clearMarks,
	configureTimeline,
	mark,
	marks,
	stallLength,
} from "./timeline";

let now = 0;
const tick = (ms: number) => {
	now += ms;
};

// Every test starts from an empty list, a fixed clock and recording on.
const test = (name: string, run: () => void) =>
	bunTest(name, () => {
		now = 1000;
		clearMarks();
		configureTimeline({ clock: () => now, enabled: true });
		run();
	});

describe("timeline", () => {
	test("marks keep insertion order and carry place and part", () => {
		mark("start-tap");
		tick(50);
		mark("first-frame", { part: 1, place: "p1" });
		tick(50);
		mark("part-end", { part: 1, place: "p1" });
		expect(marks().map((m) => m.name)).toEqual([
			"start-tap",
			"first-frame",
			"part-end",
		]);
		expect(marks()[1]).toEqual({
			at: 1050,
			name: "first-frame",
			part: 1,
			place: "p1",
		});
	});

	test("a stall pair yields a length", () => {
		mark("stall-start", { part: 2, place: "p1" });
		tick(340);
		mark("stall-end", { part: 2, place: "p1" });
		expect(stallLength("p1", 2)).toBe(340);
		expect(stallLength("p1", 1)).toBe(undefined);
	});

	test("clearMarks leaves an empty list", () => {
		mark("start-tap");
		clearMarks();
		expect(marks().length).toBe(0);
	});

	test("a place-end mark carries its cause", () => {
		mark("place-end", { detail: { cause: "narration" }, place: "p2" });
		expect(marks()[0]?.detail).toEqual({ cause: "narration" });
	});

	test("disabled mode records nothing", () => {
		configureTimeline({ enabled: false });
		mark("start-tap");
		expect(marks().length).toBe(0);
	});
});
