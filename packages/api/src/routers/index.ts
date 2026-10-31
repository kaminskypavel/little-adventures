import { publicProcedure, router } from "../index";
import { childRouter } from "./child";
import { grownUpRouter } from "./grown-up";
import { photoRouter } from "./photo";
import { videoRouter } from "./video";
import { voiceRouter } from "./voice";
import { waitlistRouter } from "./waitlist";

export const appRouter = router({
	child: childRouter,
	grownUp: grownUpRouter,
	healthCheck: publicProcedure.query(() => "OK"),
	photo: photoRouter,
	video: videoRouter,
	voice: voiceRouter,
	waitlist: waitlistRouter,
});
export type AppRouter = typeof appRouter;
