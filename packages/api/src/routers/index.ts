import { publicProcedure, router } from "../index";
import { videoRouter } from "./video";
import { waitlistRouter } from "./waitlist";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	video: videoRouter,
	waitlist: waitlistRouter,
});
export type AppRouter = typeof appRouter;
