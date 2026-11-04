import { children } from "@little-adventures/db/schema/index";
import {
	PHOTO_MAX_BYTES,
	photoUploadRequestSchema,
} from "@little-adventures/validation/photo";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { artFolder, artKeys } from "../art";
import { ownerWriteProcedure, protectedProcedure, router } from "../index";
import { ownsKey, photoKey } from "../photo-key";

export const photoRouter = router({
	/** Deletes the stored photo, face and looks of one of the caller's children and clears them. */
	delete: ownerWriteProcedure
		.input(z.object({ childId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const ownerId = ctx.principal.user.id;
			const owned = and(
				eq(children.id, input.childId),
				eq(children.ownerId, ownerId),
				isNull(children.deletedAt)
			);
			const [row] = await ctx.db.select().from(children).where(owned);
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			const keys = [...(row.photoKey ? [row.photoKey] : []), ...artKeys(row)];
			await Promise.all(
				keys
					.filter((key) => ownsKey(ownerId, key))
					.map((key) => ctx.storage.deleteObject(key))
			);
			if (row.photoKey && ownsKey(ownerId, row.photoKey)) {
				await ctx.storage.deletePrefix(
					artFolder(ownerId, row.id, row.photoKey)
				);
			}
			await ctx.db
				.update(children)
				.set({
					artStatus: "idle",
					cutKey: null,
					drawings: {},
					faceKey: null,
					photoKey: null,
				})
				.where(owned);
			return { ok: true };
		}),

	/** A url to read one of the caller's own photos. Any other key is refused. */
	readUrl: protectedProcedure
		.input(z.object({ key: z.string().min(1).max(512) }))
		.query(async ({ ctx, input }) => {
			if (!ownsKey(ctx.principal.user.id, input.key)) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			return { url: await ctx.storage.readUrl(input.key) };
		}),

	/** A one-shot signed url to PUT one photo to. The server picks the key. */
	uploadUrl: ownerWriteProcedure
		.input(photoUploadRequestSchema)
		.mutation(({ ctx, input }) => {
			if (input.size > PHOTO_MAX_BYTES) {
				throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
			}
			return ctx.storage.uploadUrlFor({
				contentLength: input.size,
				contentType: input.contentType,
				key: photoKey(ctx.principal.user.id, input.contentType),
				maxBytes: PHOTO_MAX_BYTES,
			});
		}),
});
