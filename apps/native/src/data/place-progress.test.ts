import { describe, expect, test } from "bun:test";
import { placeProgress } from "./place-progress";
import type { Part } from "./types";

const part = (id: string, durationSec: number | null, status = "playable") =>
	({ durationSec, id, status, url: "u" }) as Part;

const round = (n: number) => Math.round(n * 1000) / 1000;

describe("placeProgress", () => {
	const parts = [part("a", 4), part("b", 6)];

	test("counts both parts together", () => {
		expect(placeProgress(parts, [], 0, 0)).toBe(0);
		expect(round(placeProgress(parts, [], 0, 2))).toBe(round(0.2));
		expect(round(placeProgress(parts, [], 1, 0))).toBe(round(0.4));
		expect(placeProgress(parts, [], 1, 6)).toBe(1);
	});

	test("a part's real length wins over its marked one", () => {
		expect(round(placeProgress(parts, [5], 1, 0))).toBe(round(5 / 11));
	});

	test("a part with no length takes the average; failed parts count for nothing", () => {
		const open = [part("a", 4), part("b", null)];
		expect(round(placeProgress(open, [], 1, 0))).toBe(round(0.5));
		const failed = [part("a", 4), part("b", 6, "failed"), part("c", 4)];
		expect(round(placeProgress(failed, [], 2, 0))).toBe(round(0.5));
	});

	test("nothing before the first part", () => {
		expect(placeProgress(parts, [], -1, 0)).toBe(0);
		expect(placeProgress([], [], 0, 1)).toBe(0);
	});
});
