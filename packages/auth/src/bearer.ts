import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

/** The caller behind a request, whichever credential (bearer JWT or session cookie) proved it. */
export interface Principal {
	user: { email?: string; id: string; name?: string };
}

export interface BearerConfig {
	/** NEON_AUTH_BASE_URL, with its path (the JWKS lives under it). */
	authBaseUrl: string;
	jwks?: JWTVerifyGetKey;
}

const stringClaim = (value: unknown) =>
	typeof value === "string" ? value : undefined;

/**
 * Verifies a Neon Auth JWT (EdDSA). Neon sets `iss` and `aud` to the ORIGIN of
 * the auth URL, not the full URL. Any failure, or a banned user, yields null:
 * a bad token is unauthenticated (401), never a server error.
 */
export const createBearerVerifier = ({ authBaseUrl, jwks }: BearerConfig) => {
	const { origin } = new URL(authBaseUrl);
	const keys =
		jwks ?? createRemoteJWKSet(new URL(`${authBaseUrl}/.well-known/jwks.json`));
	return async (token: string): Promise<Principal | null> => {
		try {
			const { payload } = await jwtVerify(token, keys, {
				algorithms: ["EdDSA"],
				audience: origin,
				issuer: origin,
			});
			if (!payload.sub || payload.banned === true) {
				return null;
			}
			return {
				user: {
					email: stringClaim(payload.email),
					id: payload.sub,
					name: stringClaim(payload.name),
				},
			};
		} catch {
			return null;
		}
	};
};

const BEARER = /^Bearer (?<token>.+)$/iu;

/**
 * The caller behind a request. A `Bearer` header decides alone: a token that
 * fails verification is unauthenticated and never falls back to the cookie
 * (a stale token must not become whoever's cookie the browser holds). Any other
 * header, or none, uses the session cookie.
 */
export async function resolvePrincipal({
	authorization,
	cookieSession,
	onInvalidBearer,
	verify,
}: {
	authorization: string | null | undefined;
	cookieSession: () => Promise<Principal | null>;
	onInvalidBearer?: () => void;
	verify: (token: string) => Promise<Principal | null>;
}): Promise<Principal | null> {
	const token = authorization?.match(BEARER)?.groups?.token;
	if (!token) {
		return await cookieSession();
	}
	const principal = await verify(token);
	if (!principal) {
		onInvalidBearer?.();
	}
	return principal;
}
