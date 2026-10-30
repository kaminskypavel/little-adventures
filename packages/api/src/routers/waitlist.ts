import { waitlist } from "@little-adventures/db/schema/index";

import { publicProcedure, router } from "../index";
import { joinWaitlistInput } from "../schemas/waitlist";

export const waitlistRouter = router({
	join: publicProcedure
		.input(joinWaitlistInput)
		.mutation(async ({ ctx, input }) => {
			// A repeat email is a silent no-op.
			await ctx.db
				.insert(waitlist)
				.values({ email: input.email, platform: input.platform })
				.onConflictDoNothing({ target: waitlist.email });
			return { ok: true as const };
		}),
});
