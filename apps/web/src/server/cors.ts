import { ENV } from "@/env.server";

// The Expo web preview runs on its own origin. Only in development: in
// production the app is a native client and CORS does not apply.
const PREVIEW_ORIGIN = "http://localhost:8091";

const corsHeaders = (request: Request): Record<string, string> =>
	ENV.NODE_ENV === "development" &&
	request.headers.get("origin") === PREVIEW_ORIGIN
		? {
				"access-control-allow-credentials": "true",
				"access-control-allow-headers": "authorization, content-type",
				"access-control-allow-methods": "GET, POST, OPTIONS",
				"access-control-allow-origin": PREVIEW_ORIGIN,
				vary: "Origin",
			}
		: {};

/** Copy of `response` with the dev CORS headers added (none in production). */
export const withCors = (request: Request, response: Response) => {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(corsHeaders(request))) {
		headers.set(name, value);
	}
	return new Response(response.body, {
		headers,
		status: response.status,
		statusText: response.statusText,
	});
};

/** Answer for an `OPTIONS` preflight. */
export const preflight = (request: Request) =>
	withCors(request, new Response(null, { status: 204 }));
