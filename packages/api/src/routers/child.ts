import { children } from "@little-adventures/db/schema/index";
import { childSchema } from "@little-adventures/validation/child";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { artFolder, artKeys, drawArt, withArtUrls } from "../art";
import { ownerWriteProcedure, protectedProcedure, router } from "../index";
import { ownsKey } from "../photo-key";

const saveInput = childSchema.extend({
	grownUp: z.boolean().optional(),
	id: z.uuid().optional(),
	look: z.string().trim().min(1).max(30).optional(),
	photoKey: z.string().min(1).max(512).optional(),
	puppy: z.boolean().optional(),
});

export const childRouter = router({
	/**
	 * Soft delete: stamps `deletedAt` on one of the caller's children. Nothing is removed: the
	 * row, the photo, the face, the looks and the past adventures stay where they are, and every
	 * read of children (here and in the engine) skips the row from now on.
	 */
	delete: ownerWriteProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.update(children)
				.set({ deletedAt: new Date() })
				.where(
					and(
						eq(children.id, input.id),
						eq(children.ownerId, ctx.principal.user.id),
						isNull(children.deletedAt)
					)
				)
				.returning({ id: children.id });
			if (!row) {
				// Not found, not theirs, or already deleted.
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			return { ok: true };
		}),

	/** The caller's children that are not deleted, oldest first, with signed urls for their face and looks. */
	mine: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select()
			.from(children)
			.where(
				and(
					eq(children.ownerId, ctx.principal.user.id),
					isNull(children.deletedAt)
				)
			)
			.orderBy(asc(children.createdAt));
		return await Promise.all(rows.map((row) => withArtUrls(ctx.storage, row)));
	}),

	/**
	 * Adds a child, or updates one of the caller's own when `id` is given. A new
	 * photo starts the face and looks in the background, after the response.
	 */
	save: ownerWriteProcedure
		.input(saveInput)
		.mutation(async ({ ctx, input }) => {
			const ownerId = ctx.principal.user.id;
			const { id, ...fields } = input;
			// A photo key is only ever the caller's own upload.
			if (fields.photoKey !== undefined && !ownsKey(ownerId, fields.photoKey)) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			const [before] = id
				? await ctx.db
						.select({
							cutKey: children.cutKey,
							drawings: children.drawings,
							faceKey: children.faceKey,
							photoKey: children.photoKey,
						})
						.from(children)
						.where(
							and(
								eq(children.id, id),
								eq(children.ownerId, ownerId),
								isNull(children.deletedAt)
							)
						)
				: [];
			const newPhoto =
				fields.photoKey !== undefined && fields.photoKey !== before?.photoKey;
			const drawsArt = newPhoto && ctx.art.isConfigured;
			const stored = drawsArt
				? {
						...fields,
						artStatus: "working" as const,
						cutKey: null,
						drawings: {},
						faceKey: null,
					}
				: fields;
			const [row] = id
				? await ctx.db
						.update(children)
						.set(stored)
						.where(
							and(
								eq(children.id, id),
								eq(children.ownerId, ownerId),
								isNull(children.deletedAt)
							)
						)
						.returning()
				: await ctx.db
						.insert(children)
						.values({ ...stored, ownerId })
						.returning();
			if (!row) {
				// An update that matched nothing: not found, or not theirs.
				throw new TRPCError({
					code: id ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
				});
			}
			// The old photo's art is no longer pointed at: it must not stay in the bucket.
			const oldArt = drawsArt && before ? artKeys(before) : [];
			if (oldArt.length > 0) {
				ctx.waitUntil(
					Promise.all(oldArt.map((key) => ctx.storage.deleteObject(key)))
				);
			}
			if (newPhoto && before?.photoKey) {
				const oldPhoto = before.photoKey;
				ctx.waitUntil(
					Promise.all([
						ctx.storage.deletePrefix(artFolder(ownerId, row.id, oldPhoto)),
						ownsKey(ownerId, oldPhoto)
							? ctx.storage.deleteObject(oldPhoto)
							: undefined,
					])
				);
			}
			if (drawsArt && row.photoKey) {
				ctx.waitUntil(
					drawArt(ctx, {
						childId: row.id,
						ownerId,
						photoKey: row.photoKey,
					})
				);
			}
			return row;
		}),
});
