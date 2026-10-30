import { createAuth } from "@little-adventures/auth";
import { createBearerVerifier } from "@little-adventures/auth/bearer";

import { ENV } from "@/env";

export const auth = createAuth(ENV);

export const verify = createBearerVerifier({
	authBaseUrl: ENV.NEON_AUTH_BASE_URL,
});
