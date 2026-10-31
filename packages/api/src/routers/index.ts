import { publicProcedure, router } from "../index";
import { childRouter } from "./child";
import { photoRouter } from "./photo";
import { videoRouter } from "./video";
import { voiceRouter } from "./voice";
import { waitlistRouter } from "./waitlist";

export const appRouter = router({
	child: childRouter,
	healthCheck: publicProcedure.query(() => "OK"),
	photo: photoRouter,
	video: videoRouter,
	voice: voiceRouter,
	waitlist: waitlistRouter,
});
export type AppRouter = typeof appRouter;
