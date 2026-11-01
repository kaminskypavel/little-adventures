import type { Database } from "@little-adventures/db";
import { grownUps } from "@little-adventures/db/schema/index";
import type { Storage } from "@little-adventures/storage";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { drawGrownUpFace, grownUpArtFolder } from "../art";
import { protectedProcedure, router } from "../index";
import { ownsKey } from "../photo-key";

const rowOf = async (db: Database, ownerId: string) => {
	const [row] = await db
		.select()
		.from(grownUps)
		.where(eq(grownUps.ownerId, ownerId));
	return row;
};

const dropPhoto = async (
	storage: Storage,
	ownerId: string,
	photoKey: string
) => {
	if (ownsKey(ownerId, photoKey)) {
		await storage.deleteObject(photoKey);
		await storage.deletePrefix(grownUpArtFolder(ownerId, photoKey));
	}
};

export const grownUpRouter = router({
	delete: protectedProcedure.mutation(async ({ ctx }) => {
		const ownerId = ctx.principal.user.id;
		const row = await rowOf(ctx.db, ownerId);
		if (row) {
			await dropPhoto(ctx.storage, ownerId, row.photoKey);
		}
		await ctx.db.delete(grownUps).where(eq(grownUps.ownerId, ownerId));
		return { ok: true };
	}),

	/** The caller's grown-up photo with a signed read url, or null. */
	mine: protectedProcedure.query(async ({ ctx }) => {
		const row = await rowOf(ctx.db, ctx.principal.user.id);
		if (!row) {
			return null;
		}
		const [photoUrl, faceUrl] = await Promise.all([
			ctx.storage.readUrl(row.photoKey),
			row.faceKey ? ctx.storage.readUrl(row.faceKey) : null,
		]);
		return { ...row, faceUrl, photoUrl };
	}),

	save: protectedProcedure
		.input(z.object({ photoKey: z.string().min(1).max(512) }))
		.mutation(async ({ ctx, input }) => {
			const ownerId = ctx.principal.user.id;
			if (!ownsKey(ownerId, input.photoKey)) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			const before = await rowOf(ctx.db, ownerId);
			const [row] = await ctx.db
				.insert(grownUps)
				.values({ ownerId, photoKey: input.photoKey })
				.onConflictDoUpdate({
					set: { faceKey: null, photoKey: input.photoKey },
					target: grownUps.ownerId,
				})
				.returning();
			if (before && before.photoKey !== input.photoKey) {
				await dropPhoto(ctx.storage, ownerId, before.photoKey);
			}
			if (before?.photoKey !== input.photoKey) {
				ctx.waitUntil(
					drawGrownUpFace(ctx, { ownerId, photoKey: input.photoKey })
				);
			}
			return row;
		}),
});
