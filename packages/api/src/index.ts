import { BETA_ONLY } from "@little-adventures/auth/beta";
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
