import { describe, expect, test } from "bun:test";
import { toStyle } from "./styles";

describe("toStyle", () => {
	test("keeps the live style", () => {
		expect(toStyle("animated")).toBe("animated");
	});

	test("a locked or unknown style is animated", () => {
		for (const value of ["clay", "felt", "wood", "marble", undefined]) {
			expect(toStyle(value)).toBe("animated");
		}
	});
});
