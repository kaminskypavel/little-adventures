import { describe, expect, test } from "bun:test";
import { pickLocale } from "./pick-locale";

describe("pickLocale", () => {
	test("a language page sets the cookie", () => {
		expect(pickLocale({ path: "/es" })).toEqual({ setCookie: "es" });
		expect(pickLocale({ cookie: "es", path: "/fr" })).toEqual({
			setCookie: "fr",
		});
	});

	test("?lang=en clears the param and remembers English", () => {
		expect(pickLocale({ langParam: "en", path: "/" })).toEqual({
			redirect: "/",
			setCookie: "en",
		});
	});

	test("the cookie decides at the root", () => {
		expect(pickLocale({ cookie: "es", path: "/" })).toEqual({
			redirect: "/es",
		});
		expect(pickLocale({ cookie: "fr", path: "/" })).toEqual({
			redirect: "/fr",
		});
		expect(
			pickLocale({ acceptLanguage: "fr", cookie: "en", path: "/" })
		).toEqual({});
	});

	test("without a cookie the browser language decides", () => {
		const at = (acceptLanguage?: string) =>
			pickLocale({ acceptLanguage, path: "/" });
		expect(at("fr-FR,fr;q=0.9")).toEqual({ redirect: "/fr" });
		expect(at("de,es;q=0.5,fr;q=0.8")).toEqual({ redirect: "/fr" });
		expect(at("es,fr")).toEqual({ redirect: "/es" });
		expect(at("en-US,fr;q=0.5")).toEqual({});
		expect(at("de-DE,de;q=0.9")).toEqual({});
		expect(at("fr;q=0,es;q=0.1")).toEqual({ redirect: "/es" });
		expect(at()).toEqual({});
	});
});
