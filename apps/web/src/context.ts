import type { Context as ApiContext } from "@little-adventures/api/context";
import { resolvePrincipal } from "@little-adventures/auth/bearer";

import { auth, verify } from "./server/auth";
import { storage } from "./server/storage";
import { db } from "./services";

export async function createContext(req: Request): Promise<ApiContext> {
	const principal = await resolvePrincipal({
		authorization: req.headers.get("authorization"),
		// The session cookie, for a browser that is signed in without a bearer. A failed
		// lookup means signed out, never a server error on a public call.
		cookieSession: async () => {
			try {
				const { data } = await auth.getSession();
				if (!data?.user) {
					return null;
				}
				const { email, id, name } = data.user;
				return { user: { email, id, name } };
			} catch {
				return null;
			}
		},
		verify,
	});
	return { db, principal, storage };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
