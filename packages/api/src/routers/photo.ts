import {
	PHOTO_MAX_BYTES,
	photoUploadRequestSchema,
} from "@little-adventures/validation/photo";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { ownsKey, photoKey } from "../photo-key";

export const photoRouter = router({
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
	uploadUrl: protectedProcedure
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
