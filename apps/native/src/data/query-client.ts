import { QueryClient } from "@tanstack/react-query";

/** The one cache for the whole app (no SSR on Expo, so a module singleton is fine). */
export const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
