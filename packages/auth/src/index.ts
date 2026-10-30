import { createNeonAuth } from "@neondatabase/auth/next/server";

export type { Principal } from "./bearer";

export interface AuthConfig {
	NEON_AUTH_BASE_URL: string;
	NEON_AUTH_COOKIE_SECRET: string;
}

// Neon Auth is hosted Better Auth: users live in the neon_auth schema of the
// Neon database, and providers and plugins are configured in the Neon console.
export function createAuth(env: AuthConfig) {
	return createNeonAuth({
		baseUrl: env.NEON_AUTH_BASE_URL,
		cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
	});
}

export type Auth = ReturnType<typeof createAuth>;
