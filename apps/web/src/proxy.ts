import { type NextRequest, NextResponse } from "next/server";
import { pickLocale } from "@/i18n/pick-locale";

const COOKIE = "la-locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;
	const { redirect, setCookie } = pickLocale({
		acceptLanguage: request.headers.get("accept-language"),
		cookie: request.cookies.get(COOKIE)?.value,
		langParam: searchParams.get("lang"),
		path: pathname,
	});
	const response = redirect
		? NextResponse.redirect(new URL(redirect, request.url), 307)
		: NextResponse.next();
	if (setCookie) {
		response.cookies.set(COOKIE, setCookie, {
			maxAge: ONE_YEAR,
			path: "/",
			sameSite: "lax",
		});
	}
	return response;
}

export const config = { matcher: ["/", "/es", "/fr"] };
