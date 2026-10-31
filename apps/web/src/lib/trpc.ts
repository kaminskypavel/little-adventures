import type { AppRouter } from "@little-adventures/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export const trpc = createTRPCClient<AppRouter>({
	links: [httpBatchLink({ url: "/api/trpc" })],
});
