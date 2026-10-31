import { publicProcedure, router } from "../index";
import { childRouter } from "./child";
import { photoRouter } from "./photo";
import { videoRouter } from "./video";
import { waitlistRouter } from "./waitlist";

export const appRouter = router({
	child: childRouter,
	healthCheck: publicProcedure.query(() => "OK"),
	photo: photoRouter,
	video: videoRouter,
	waitlist: waitlistRouter,
});
export type AppRouter = typeof appRouter;
