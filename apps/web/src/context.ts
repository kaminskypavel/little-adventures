import { timingSafeEqual } from "node:crypto";
import type { Context as ApiContext } from "@little-adventures/api/context";
import { isBetaMember } from "@little-adventures/api/routers/beta";
import { resolvePrincipal } from "@little-adventures/auth/bearer";
import { betaEmails, inBeta } from "@little-adventures/auth/beta";
import { createImageEditing } from "@little-adventures/image-editing";
import { createTranscription } from "@little-adventures/transcribe";
import { after } from "next/server";

import { ENV } from "./env.server";
import { auth, verify } from "./server/auth";
import { storage } from "./server/storage";
import { db } from "./services";

const art = createImageEditing({ apiKey: ENV.META_API_KEY });
const voice = createTranscription({ apiKey: ENV.META_API_KEY });
const beta = betaEmails(ENV.BETA_EMAILS);
const invite = ENV.BETA_INVITE_CODE?.trim().toLowerCase() ?? "";

/** The invite code from the submission, compared in constant time and case-insensitively. */
const inviteMatches = (code: string) => {
	const given = Buffer.from(code.trim().toLowerCase());
	const wanted = Buffer.from(invite);
	return (
		invite.length > 0 &&
		given.length === wanted.length &&
		timingSafeEqual(given, wanted)
	);
};

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
	return {
		art,
		db,
		inviteMatches,
		isBeta: async ({ user }) =>
			inBeta(beta, user.email) || (await isBetaMember(db, user.id)),
		principal,
		storage,
		voice,
		waitUntil: (work) => after(work),
	};
}
