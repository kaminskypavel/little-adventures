// React Query options for the engine (REST). Types come from engine-client.ts only; the engine's
// own router type never enters this repo. Without an engine `getMe` answers null.
import {
	mutationOptions,
	type QueryClient,
	queryOptions,
} from "@tanstack/react-query";
import { getMe, setLive, setSteps } from "./adventure-client";
import type { EngineMe, EngineSteps } from "./engine-client";
import { optimisticSet, rollback, type Snapshot } from "./optimistic";

type Me = EngineMe | null;

export const engineKeys = {
	me: ["engine", "me"] as const,
};

/** The signed-in account as the engine knows it; null in sample mode. */
export const meOptions = () =>
	queryOptions<EngineMe | null>({
		queryFn: getMe,
		queryKey: engineKeys.me,
	});

const settle = (client: QueryClient) => () =>
	client.invalidateQueries({ queryKey: engineKeys.me });

/** Admin switch for real adventures: the cache shows the new value at once, rolls back on error. */
export const setLiveOptions = (client: QueryClient) =>
	mutationOptions({
		mutationFn: (on: boolean) => setLive(on),
		onError: (_error, _on, snapshot?: Snapshot<Me>) =>
			rollback(client, engineKeys.me, snapshot),
		onMutate: (on) =>
			optimisticSet<Me>(client, engineKeys.me, (me) => ({ ...me, live: on })),
		onSettled: settle(client),
	});

/** Admin switches for the paid steps, same optimistic rule. */
export const setStepsOptions = (client: QueryClient) =>
	mutationOptions({
		mutationFn: (steps: Partial<EngineSteps>) => setSteps(steps),
		onError: (_error, _steps, snapshot?: Snapshot<Me>) =>
			rollback(client, engineKeys.me, snapshot),
		onMutate: (steps) =>
			optimisticSet<Me>(client, engineKeys.me, (me) => ({
				...me,
				steps: { ...me.steps, ...steps },
			})),
		onSettled: settle(client),
	});
