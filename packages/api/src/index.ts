import { BETA_ONLY } from "@little-adventures/auth/beta";
import { isGuest } from "@little-adventures/auth/guest";
import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const { procedure: publicProcedure, router } = t;

/** Needs a signed-in grown-up, in the beta or not (joining the beta). `ctx.principal` is never null. */
export const signedInProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.principal) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({ ctx: { ...ctx, principal: ctx.principal } });
});

/** Signed in and in the private beta: everyone else is refused before any paid call. */
export const protectedProcedure = signedInProcedure.use(
	async ({ ctx, next }) => {
		if (!(await ctx.isBeta(ctx.principal))) {
			throw new TRPCError({ code: "FORBIDDEN", message: BETA_ONLY });
		}
		return next();
	}
);

/** The message a refused guest write carries, so the app can show the "needs an account" popup. */
export const GUEST_READ_ONLY = "GUEST_READ_ONLY";

/** Writes to the owner's own data (children, photos, grown-up): the shared guest account may not. */
export const ownerWriteProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (isGuest(ctx.principal)) {
		throw new TRPCError({ code: "FORBIDDEN", message: GUEST_READ_ONLY });
	}
	return next();
});
