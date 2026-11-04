import { resetGuestProgress } from "@little-adventures/api/guest";
import { GUEST_EMAIL } from "@little-adventures/auth/guest";

import { ENV } from "@/env.server";
import { auth } from "@/server/auth";
import { withCors } from "@/server/cors";
import { db } from "@/services";

const handlers = auth.handler();

/**
 * "Try as a guest": signs in to the shared guest account on the app's behalf
 * (the password stays in this server's env), resets the guest's progress, and
 * returns the sign-in response with its Set-Cookie. The app then mints its JWT
 * from that cookie, exactly as after the email code sign-in.
 */
export const POST = async (request: Request) => {
	if (!ENV.GUEST_PASSWORD) {
		return withCors(
			request,
			Response.json({ error: "Guest sign-in is off" }, { status: 503 })
		);
	}
	const signIn = new Request(new URL("/api/auth/sign-in/email", request.url), {
		body: JSON.stringify({ email: GUEST_EMAIL, password: ENV.GUEST_PASSWORD }),
		headers: {
			"content-type": "application/json",
			"user-agent": request.headers.get("user-agent") ?? "",
		},
		method: "POST",
	});
	const response = await handlers.POST(signIn, {
		params: Promise.resolve({ path: ["sign-in", "email"] }),
	});
	if (!response.ok) {
		return withCors(request, response);
	}
	const body = (await response.json()) as { user?: { id?: unknown } };
	const userId = body.user?.id;
	if (typeof userId === "string") {
		// Best effort: a failed reset must not lock a judge out.
		await resetGuestProgress(db, userId).catch(() => undefined);
	}
	// The JWT rides in the body too, so the app needs no cookie jar to start (a phone drops
	// Secure cookies on a plain http dev server); the cookies still let it mint a fresh one later.
	const cookie = response.headers
		.getSetCookie()
		.map((line) => line.split(";")[0])
		.join("; ");
	const minted = await handlers.GET(
		new Request(new URL("/api/auth/token", request.url), {
			headers: { cookie },
		}),
		{ params: Promise.resolve({ path: ["token"] }) }
	);
	const token = minted.ok
		? ((await minted.json()) as { token?: unknown }).token
		: undefined;
	const headers = new Headers(response.headers);
	headers.delete("content-length");
	return withCors(
		request,
		new Response(JSON.stringify({ ...body, token }), { headers, status: 200 })
	);
};
