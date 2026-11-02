import { publicProcedure, router } from "../index";
import { betaRouter } from "./beta";
import { childRouter } from "./child";
import { grownUpRouter } from "./grown-up";
import { photoRouter } from "./photo";
import { voiceRouter } from "./voice";
import { waitlistRouter } from "./waitlist";

export const appRouter = router({
	beta: betaRouter,
	child: childRouter,
	grownUp: grownUpRouter,
	healthCheck: publicProcedure.query(() => "OK"),
	photo: photoRouter,
	voice: voiceRouter,
	waitlist: waitlistRouter,
});
export type AppRouter = typeof appRouter;
