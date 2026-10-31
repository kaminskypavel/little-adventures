import { describe, expect, test } from "bun:test";
import { dictionaries, LOCALES } from "./dictionaries";

const EM_DASH = String.fromCharCode(0x20_14);

const strings = (value: unknown): string[] =>
	typeof value === "string"
		? [value]
		: Object.values(value as object).flatMap(strings);

describe.each(LOCALES)("dictionary %s", (locale) => {
	const dict = dictionaries[locale];

	test("meta fits the search and share limits", () => {
		expect(dict.meta.title.length).toBeLessThanOrEqual(60);
		expect(dict.meta.shareDescription.length).toBeLessThanOrEqual(125);
		expect(dict.meta.description.length).toBeLessThanOrEqual(160);
	});

	test("scenes have the same titles and questions as English", () => {
		for (const [id, scene] of Object.entries(dictionaries.en.scenes)) {
			const mine = dict.scenes[id as keyof typeof dict.scenes];
			expect(Boolean(mine.title)).toBe(Boolean(scene.title));
			expect(Boolean(mine.question)).toBe(Boolean(scene.question));
		}
	});

	test("no string is empty or has an em dash", () => {
		for (const text of strings(dict)) {
			expect(text.trim()).not.toBe("");
			expect(text).not.toContain(EM_DASH);
		}
	});
});
