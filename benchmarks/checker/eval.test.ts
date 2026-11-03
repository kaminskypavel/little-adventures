import { expect, test } from "bun:test";

import { mcnemar, metrics, wilson } from "./eval";

test("balanced accuracy is the mean of recall on passing and failing rows", () => {
	// 4 passing rows (3 right), 2 failing rows (1 caught): (0.75 + 0.5) / 2
	const m = metrics(
		[true, true, true, false, true, false],
		["pass", "pass", "pass", "pass", "fail", "fail"]
	);
	expect(m.balancedAccuracy).toBeCloseTo(0.625, 10);
	expect([m.caught, m.falseAlarms]).toEqual([1, 1]);
});

test("Wilson 95% interval for 8 of 10", () => {
	const [lo, hi] = wilson(8, 10);
	expect(lo).toBeCloseTo(0.4902, 3);
	expect(hi).toBeCloseTo(0.9433, 3);
});

test("exact McNemar", () => {
	expect(mcnemar(1, 5)).toBeCloseTo(0.218_75, 10); // 2 * (1 + 6) / 64
	expect(mcnemar(0, 10)).toBeCloseTo(2 / 1024, 10);
	expect(mcnemar(0, 0)).toBe(1);
});
