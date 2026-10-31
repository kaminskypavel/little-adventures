import { LOCALES, type Locale } from "./dictionaries";

interface Input {
	acceptLanguage?: string | null;
	cookie?: string | null;
	langParam?: string | null;
	path: string;
}

interface Choice {
	redirect?: string;
	setCookie?: Locale;
}

const isLocale = (value: string | null | undefined): value is Locale =>
	LOCALES.includes(value as Locale);

// The first supported language in an Accept-Language header: highest q first, ties keep order.
const fromHeader = (header: string): Locale | undefined => {
	const ranked = header.split(",").map((part, order) => {
		const [tag = "", ...params] = part.trim().split(";");
		const q = params.find((p) => p.trim().startsWith("q="));
		const weight = q ? Number(q.trim().slice(2)) : 1;
		return {
			code: tag.trim().toLowerCase().split("-")[0],
			order,
			weight: Number.isNaN(weight) ? 0 : weight,
		};
	});
	ranked.sort((a, b) => b.weight - a.weight || a.order - b.order);
	return ranked.map((r) => r.code).find(isLocale);
};

// What the proxy does for "/", "/es" and "/fr": remember a chosen language, and send
// a first-time visitor to the language they asked their browser for.
export function pickLocale({
	acceptLanguage,
	cookie,
	langParam,
	path,
}: Input): Choice {
	const onPage = path.slice(1);
	if (isLocale(onPage) && onPage !== "en") {
		return { setCookie: onPage };
	}
	if (path !== "/") {
		return {};
	}
	if (langParam === "en") {
		return { redirect: "/", setCookie: "en" };
	}
	const wanted = isLocale(cookie) ? cookie : fromHeader(acceptLanguage ?? "");
	return wanted && wanted !== "en" ? { redirect: `/${wanted}` } : {};
}
