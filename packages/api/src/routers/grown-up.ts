import { grownUps } from "@little-adventures/db/schema/index";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { grownUpArtFolder } from "../art";
import { protectedProcedure, router } from "../index";
import { ownsKey } from "../photo-key";

export const grownUpRouter = router({
	/** Removes the caller's photo, everything drawn from it, and the row. */
	delete: protectedProcedure.mutation(async ({ ctx }) => {
		const ownerId = ctx.principal.user.id;
		const [row] = await ctx.db
			.select()
			.from(grownUps)
			.where(eq(grownUps.ownerId, ownerId));
		if (row && ownsKey(ownerId, row.photoKey)) {
			await ctx.storage.deleteObject(row.photoKey);
			await ctx.storage.deletePrefix(grownUpArtFolder(ownerId, row.photoKey));
		}
		await ctx.db.delete(grownUps).where(eq(grownUps.ownerId, ownerId));
		return { ok: true };
	}),

	/** The caller's grown-up photo with a signed read url, or null. */
	mine: protectedProcedure.query(async ({ ctx }) => {
		const [row] = await ctx.db
			.select()
			.from(grownUps)
			.where(eq(grownUps.ownerId, ctx.principal.user.id));
		return row
			? { ...row, photoUrl: await ctx.storage.readUrl(row.photoKey) }
			: null;
	}),

	/** Saves the caller's photo; a different old photo's art folder is removed. */
	save: protectedProcedure
		.input(z.object({ photoKey: z.string().min(1).max(512) }))
		.mutation(async ({ ctx, input }) => {
			const ownerId = ctx.principal.user.id;
			if (!ownsKey(ownerId, input.photoKey)) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			const [before] = await ctx.db
				.select()
				.from(grownUps)
				.where(eq(grownUps.ownerId, ownerId));
			const [row] = await ctx.db
				.insert(grownUps)
				.values({ ownerId, photoKey: input.photoKey })
				.onConflictDoUpdate({
					set: { photoKey: input.photoKey },
					target: grownUps.ownerId,
				})
				.returning();
			if (
				before &&
				before.photoKey !== input.photoKey &&
				ownsKey(ownerId, before.photoKey)
			) {
				// The replaced photo is the grown-up's likeness: it must not stay in the bucket.
				await ctx.storage.deleteObject(before.photoKey);
				await ctx.storage.deletePrefix(
					grownUpArtFolder(ownerId, before.photoKey)
				);
			}
			return row;
		}),
});
