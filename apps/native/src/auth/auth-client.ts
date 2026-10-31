import { openAuthSessionAsync, openBrowserAsync } from "expo-web-browser";
import { Platform } from "react-native";
import { ENV } from "@/src/env";
import { withRetryOn401 } from "./retry-on-401";
import { clearToken, readToken, writeToken } from "./token-store";

export interface User {
	email: string | null;
	id: string;
	name: string | null;
}

export interface Session {
	status: "loading" | "signed-out" | "signed-in";
	user: User | null;
}

const TRAILING_SLASH = /\/$/u;
const SERVER = ENV.EXPO_PUBLIC_SERVER_URL.replace(TRAILING_SLASH, "");
const NATIVE_RETURN = "little-adventures://auth/callback";
const SIGNED_OUT: Session = { status: "signed-out", user: null };

let session: Session = { status: "loading", user: null };
let token: string | null = null;
let started: Promise<void> | null = null;
const listeners = new Set<() => void>();

const setSession = (next: Session) => {
	session = next;
	for (const listener of listeners) {
		listener();
	}
};

// ponytail: a name with non-ASCII letters may decode garbled; it is only informational.
function userFrom(jwt: string): User | null {
	try {
		const payload = JSON.parse(
			atob(jwt.split(".")[1].replace(/-/gu, "+").replace(/_/gu, "/"))
		);
		return {
			email: payload.email ?? null,
			id: payload.sub ?? payload.id,
			name: payload.name ?? null,
		};
	} catch {
		return null;
	}
}

const post = (path: string, body: unknown) =>
	fetch(`${SERVER}${path}`, {
		body: JSON.stringify(body),
		credentials: "include",
		headers: { "content-type": "application/json" },
		method: "POST",
	});

/** Adopt a JWT: keep it in memory and the token store, and flip the session to signed in. */
async function adopt(jwt: string) {
	token = jwt;
	await writeToken(jwt).catch(() => undefined);
	setSession({ status: "signed-in", user: userFrom(jwt) });
}

/** Ask the server for a fresh JWT using the session cookie. Null when there is no session. */
async function mint(): Promise<string | null> {
	try {
		const res = await fetch(`${SERVER}/api/auth/token`, {
			credentials: "include",
		});
		if (!res.ok) {
			return null;
		}
		const data = (await res.json()) as { token?: string };
		if (!data.token) {
			return null;
		}
		await adopt(data.token);
		return data.token;
	} catch {
		return null;
	}
}

async function restore() {
	try {
		const stored = await readToken();
		if (stored) {
			token = stored;
			setSession({ status: "signed-in", user: userFrom(stored) });
			return;
		}
	} catch {
		// Keychain unavailable: fall through to the cookie.
	}
	if (!(await mint())) {
		setSession(SIGNED_OUT);
	}
}

/** Runs once, on the first subscriber (never during server rendering). */
const start = () => {
	started ??= restore();
	return started;
};

export const subscribe = (listener: () => void) => {
	listeners.add(listener);
	start();
	return () => {
		listeners.delete(listener);
	};
};

export const getSession = () => session;

/** Email a one-time sign-in code. */
export async function sendCode(email: string) {
	try {
		const res = await post("/api/auth/email-otp/send-verification-otp", {
			email,
			type: "sign-in",
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Trade the emailed code for a session, then a JWT. */
export async function verifyCode(email: string, otp: string) {
	try {
		const res = await post("/api/auth/sign-in/email-otp", { email, otp });
		return res.ok && (await mint()) !== null;
	} catch {
		return false;
	}
}

/** Redeem the session verifier a social sign-in returns in the query string. */
export async function redeemVerifier(query: string) {
	try {
		const res = await fetch(`${SERVER}/api/auth/get-session?${query}`, {
			credentials: "include",
		});
		return res.ok && (await mint()) !== null;
	} catch {
		return false;
	}
}

/**
 * Google sign-in. On a phone: the system browser sheet, then the verifier comes back on the app
 * scheme. On the web preview the page itself leaves for Google and returns to /account with the
 * verifier in the query; the account screen redeems it.
 */
export async function signInWithGoogle(): Promise<
	"ok" | "cancelled" | "failed"
> {
	try {
		const web = Platform.OS === "web";
		const res = await post("/api/auth/sign-in/social", {
			callbackURL: web
				? `${globalThis.location.origin}/account`
				: `${SERVER}/auth/native/callback`,
			disableRedirect: true,
			provider: "google",
		});
		const data = (await res.json()) as { url?: string };
		if (!(res.ok && data.url)) {
			return "failed";
		}
		if (web) {
			await openBrowserAsync(data.url, { windowName: "_self" });
			return "cancelled";
		}
		const result = await openAuthSessionAsync(data.url, NATIVE_RETURN);
		if (result.type !== "success") {
			return "cancelled";
		}
		const query = result.url.split("?")[1] ?? "";
		return (await redeemVerifier(query)) ? "ok" : "failed";
	} catch {
		return "failed";
	}
}

/** Forget the session here first, then tell the server. */
export async function signOut() {
	token = null;
	await clearToken().catch(() => undefined);
	setSession(SIGNED_OUT);
	await post("/api/auth/sign-out", {}).catch(() => undefined);
}

/** The current JWT, minting one from the session cookie when there is none yet. */
export async function getToken() {
	await start();
	return token ?? (await mint());
}

const withBearer = (headers: HeadersInit | undefined, jwt: string | null) => {
	const next = new Headers(headers);
	if (jwt) {
		next.set("authorization", `Bearer ${jwt}`);
	}
	return next;
};

/**
 * fetch against our server with the bearer JWT. A 401 mints a fresh JWT once and retries once;
 * if that fails too the session is over and the user is signed out.
 */
export const authedFetch = (path: string, init: RequestInit = {}) =>
	withRetryOn401({
		call: (jwt) =>
			fetch(`${SERVER}${path}`, {
				...init,
				credentials: "include",
				headers: withBearer(init.headers, jwt),
			}),
		getToken,
		mint,
		signOut,
	});

/**
 * The same bearer token and the same 401 rule against another server (the engine), by its base
 * url. The token alone signs the call, so no cookies travel.
 */
export const authedFetchTo = (base: string) => {
	const origin = base.replace(TRAILING_SLASH, "");
	return (path: string, init: RequestInit = {}) =>
		withRetryOn401({
			call: (jwt) =>
				fetch(`${origin}${path}`, {
					...init,
					credentials: "omit",
					headers: withBearer(init.headers, jwt),
				}),
			getToken,
			mint,
			signOut,
		});
};
