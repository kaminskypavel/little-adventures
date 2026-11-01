import { describe, expect, test } from "bun:test";
import { backTarget } from "./back-rules";

describe("backTarget", () => {
	test("goes back on a pushed screen", () => {
		expect(backTarget("map", true)).toBe("back");
	});
	test("goes Home when there is nothing to go back to (a reload)", () => {
		expect(backTarget("map", false)).toBe("home");
	});
	test("is off on the first screens even with a stack under them", () => {
		for (const name of ["index", "welcome", "hello", "home"]) {
			expect(backTarget(name, true)).toBe(null);
			expect(backTarget(name, false)).toBe(null);
		}
	});
});
