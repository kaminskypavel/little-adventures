import { describe, expect, test } from "bun:test";
import { defineStrings, fill, isRtl, LANGUAGES } from "./index";

describe("fill", () => {
	test("puts values in their slots and leaves unknown slots", () => {
		expect(fill("What shall we explore, {name}?", { name: "Aviv" })).toBe(
			"What shall we explore, Aviv?"
		);
		expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
		expect(fill("no slots")).toBe("no slots");
	});

	test("a Spanish and a Hebrew line fill the same way", () => {
		const set = defineStrings({
			en: { hello: "Hi {name}" },
			es: { hello: "Hola, {name}" },
			he: { hello: "היי {name}" },
		});
		expect(fill(set.es.hello, { name: "Aviv" })).toBe("Hola, Aviv");
		expect(fill(set.he.hello, { name: "אביב" })).toBe("היי אביב");
	});
});

describe("languages", () => {
	test("lists English, Spanish and Hebrew with flags", () => {
		expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "es", "he"]);
		expect(LANGUAGES.find((l) => l.code === "es")).toEqual({
			code: "es",
			flag: "🇪🇸",
			name: "Español",
		});
	});

	test("only Hebrew reads right to left", () => {
		expect(isRtl("he")).toBe(true);
		expect(isRtl("es")).toBe(false);
		expect(isRtl("en")).toBe(false);
	});
});
