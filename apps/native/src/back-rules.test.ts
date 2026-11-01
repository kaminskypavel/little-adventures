import { describe, expect, test } from "bun:test";
import { showsBack } from "./back-rules";

describe("showsBack", () => {
	test("is on for a pushed screen", () => {
		expect(showsBack("map", true)).toBe(true);
	});
	test("is off when there is nothing to go back to", () => {
		expect(showsBack("map", false)).toBe(false);
	});
	test("is off on the first screens even with a stack under them", () => {
		for (const name of ["index", "welcome", "hello", "home"]) {
			expect(showsBack(name, true)).toBe(false);
		}
	});
});
