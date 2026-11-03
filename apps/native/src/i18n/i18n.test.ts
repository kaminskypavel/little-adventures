import { describe, expect, test } from "bun:test";
import { defineStrings, fill } from "./index";

describe("fill", () => {
	test("puts values in their slots and leaves unknown slots", () => {
		expect(fill("What shall we explore, {name}?", { name: "Aviv" })).toBe(
			"What shall we explore, Aviv?"
		);
		expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
		expect(fill("no slots")).toBe("no slots");
	});

	test("a Hebrew line fills the same way", () => {
		const set = defineStrings({
			en: { hello: "Hi {name}" },
			he: { hello: "היי {name}" },
		});
		expect(fill(set.he.hello, { name: "אביב" })).toBe("היי אביב");
	});
});
