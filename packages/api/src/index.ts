import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const { procedure: publicProcedure, router } = t;

/** Needs a signed-in grown-up. Inside, `ctx.principal` is never null. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.principal) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({ ctx: { ...ctx, principal: ctx.principal } });
});
