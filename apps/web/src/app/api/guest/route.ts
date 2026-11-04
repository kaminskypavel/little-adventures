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
	if (response.ok) {
		const body: unknown = await response.clone().json();
		const userId = (body as { user?: { id?: unknown } }).user?.id;
		if (typeof userId === "string") {
			// Best effort: a failed reset must not lock a judge out.
			await resetGuestProgress(db, userId).catch(() => undefined);
		}
	}
	return withCors(request, response);
};
