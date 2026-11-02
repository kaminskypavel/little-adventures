import type { Database } from "@little-adventures/db";
import { betaMembers, inviteCodes } from "@little-adventures/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { router, signedInProcedure } from "../index";

export const INVITE_REFUSED = "That code did not work";

/** Whether this grown-up joined the beta with the invite code. */
export async function isBetaMember(db: Database, ownerId: string) {
	const [row] = await db
		.select({ ownerId: betaMembers.ownerId })
		.from(betaMembers)
		.where(eq(betaMembers.ownerId, ownerId));
	return row !== undefined;
}

export const betaRouter = router({
	/** Joins the private beta with an active invite code (any case); joining twice is fine. */
	join: signedInProcedure
		.input(z.object({ code: z.string().trim().min(1).max(100) }))
		.mutation(async ({ ctx, input }) => {
			const [invite] = await ctx.db
				.select({ code: inviteCodes.code, livePerDay: inviteCodes.livePerDay })
				.from(inviteCodes)
				.where(
					and(
						eq(inviteCodes.code, input.code.toLowerCase()),
						eq(inviteCodes.active, true)
					)
				);
			if (!invite) {
				throw new TRPCError({ code: "FORBIDDEN", message: INVITE_REFUSED });
			}
			await ctx.db
				.insert(betaMembers)
				.values({
					code: invite.code,
					email: ctx.principal.user.email ?? null,
					livePerDay: invite.livePerDay,
					ownerId: ctx.principal.user.id,
				})
				.onConflictDoNothing();
			return { ok: true };
		}),

	/** Whether the signed-in grown-up is in the private beta. */
	status: signedInProcedure.query(async ({ ctx }) => ({
		member: await ctx.isBeta(ctx.principal),
	})),
});
