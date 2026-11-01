import type { AppRouter } from "@little-adventures/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { authedFetch } from "@/src/auth/auth-client";
import { ENV } from "@/src/env";
import { queryClient } from "./query-client";

const SERVER = ENV.EXPO_PUBLIC_SERVER_URL.replace(/\/$/u, "");

/**
 * `authedFetch` adds the bearer JWT and does the 401 rule (mint once, retry once, else sign out).
 * It takes a path on our server, so the absolute url the link builds is cut back to its path.
 */
const authedFetchLike: typeof fetch = (input, init) =>
	authedFetch(String(input).slice(SERVER.length), init);

/** The plain client, for callers outside React (adventure-client.ts, photo-upload.ts). */
// The batch link, not the stream link: the dev CORS rules allow only authorization and content-type.
export const trpcClient = createTRPCClient<AppRouter>({
	links: [httpBatchLink({ fetch: authedFetchLike, url: `${SERVER}/api/trpc` })],
});

/** Query and mutation options for the React Query hooks: `useQuery(trpc.child.mine.queryOptions())`. */
export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
