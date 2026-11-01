import { describe, expect, test } from "bun:test";
import { isAdminMe } from "./use-is-admin";

const me = (extra: Record<string, unknown>) => ({
	id: "u1",
	live: false,
	steps: {},
	...extra,
});

describe("isAdminMe", () => {
	test("shows only for isAdmin true", () => {
		expect(isAdminMe(me({ isAdmin: true }))).toBe(true);
	});
	test("hides for isAdmin false", () => {
		expect(isAdminMe(me({ isAdmin: false }))).toBe(false);
	});
	test("hides while loading, on error or without an engine (null/undefined)", () => {
		expect(isAdminMe(null)).toBe(false);
		expect(isAdminMe(undefined)).toBe(false);
	});
	test("hides when the field is missing", () => {
		expect(isAdminMe(me({}))).toBe(false);
	});
	test("hides for truthy non-booleans", () => {
		for (const v of ["true", 1, {}, [], "yes"]) {
			expect(isAdminMe(me({ isAdmin: v }))).toBe(false);
		}
	});
	test("hides for non-objects", () => {
		expect(isAdminMe(true)).toBe(false);
		expect(isAdminMe("admin")).toBe(false);
	});
});
