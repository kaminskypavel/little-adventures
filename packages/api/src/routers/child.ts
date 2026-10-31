import { children } from "@little-adventures/db/schema/index";
import { childSchema } from "@little-adventures/validation/child";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { ownsKey } from "../photo-key";

const saveInput = childSchema.extend({
	grownUp: z.boolean().optional(),
	id: z.uuid().optional(),
	look: z.string().trim().min(1).max(30).optional(),
	photoKey: z.string().min(1).max(512).optional(),
	puppy: z.boolean().optional(),
});

export const childRouter = router({
	/** The caller's children, oldest first. */
	mine: protectedProcedure.query(({ ctx }) =>
		ctx.db
			.select()
			.from(children)
			.where(eq(children.ownerId, ctx.principal.user.id))
			.orderBy(asc(children.createdAt))
	),

	/** Adds a child, or updates one of the caller's own when `id` is given. */
	save: protectedProcedure.input(saveInput).mutation(async ({ ctx, input }) => {
		const ownerId = ctx.principal.user.id;
		const { id, ...fields } = input;
		// A photo key is only ever the caller's own upload.
		if (fields.photoKey !== undefined && !ownsKey(ownerId, fields.photoKey)) {
			throw new TRPCError({ code: "FORBIDDEN" });
		}
		const [row] = id
			? await ctx.db
					.update(children)
					.set(fields)
					.where(and(eq(children.id, id), eq(children.ownerId, ownerId)))
					.returning()
			: await ctx.db
					.insert(children)
					.values({ ...fields, ownerId })
					.returning();
		if (!row) {
			// An update that matched nothing: not found, or not theirs.
			throw new TRPCError({ code: id ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR" });
		}
		return row;
	}),
});
