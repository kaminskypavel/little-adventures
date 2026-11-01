import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** What `optimisticSet` hands back to `onError`: the cache value from before the write. */
export interface Snapshot<T> {
	prev: T | undefined;
}

/**
 * The one optimistic write for every mutation, to call from `onMutate`: stop reads in flight
 * (they would overwrite it), keep what was cached, set the changed copy. Nothing is written
 * while the cache is empty or null (a first load, sample mode).
 */
export async function optimisticSet<T>(
	client: QueryClient,
	key: QueryKey,
	change: (value: NonNullable<T>) => T
): Promise<Snapshot<T>> {
	await client.cancelQueries({ queryKey: key });
	const prev = client.getQueryData<T>(key);
	if (prev !== undefined && prev !== null) {
		client.setQueryData<T>(key, change(prev as NonNullable<T>));
	}
	return { prev };
}

/** Puts back what `optimisticSet` kept, to call from `onError`. */
export function rollback<T>(
	client: QueryClient,
	key: QueryKey,
	snapshot: Snapshot<T> | undefined
) {
	if (snapshot && snapshot.prev !== undefined) {
		client.setQueryData<T>(key, snapshot.prev);
	}
}
