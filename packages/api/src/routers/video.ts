import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../index";

// Not wired yet. Later this streams the app's video results back to the app
// over tRPC subscriptions (server-sent events). It makes no network call today.
export const videoRouter = router({
	watch: publicProcedure
		.input(z.object({ id: z.string().min(1) }))
		.subscription(() => {
			throw new TRPCError({
				code: "NOT_IMPLEMENTED",
				message: "Video streaming is not wired yet.",
			});
		}),
});
