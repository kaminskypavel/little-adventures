import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	getAdventure,
	getProgress,
	reloadAdventure,
	visit as visitNode,
} from "./adventure-client";
import { makeExpiryGuard, pollAdventure, sleep } from "./engine-client";
import { queryClient } from "./query-client";
import type { Adventure, NodeId, Progress } from "./types";

// In the shared cache, which signing out clears.
const adventureKey = (id: string) => ["adventure", id] as const;
const progressKey = (id: string) => ["adventure", id, "progress"] as const;

const remember = (id: string, p: Progress) => {
	queryClient.setQueryData(progressKey(id), p);
	return p;
};

/** The pictures the map shows first: the places and the goal, so they are on disk before it opens. */
const mapPictures = (a: Adventure) =>
	[
		...Object.values(a.places).map((place) => place.picture),
		a.endGoal.open,
		a.endGoal.closed,
	].flatMap((picture) =>
		picture && typeof picture === "object" ? [picture] : []
	);

// Decoded small: the download is what is kept on disk for the map and the places.
const PREFETCH_WIDTH = 300;

/** Loads a picture through the image cache under its own cache key, then lets the decoded copy go. */
const warm = async (source: { cacheKey?: string; uri: string }) =>
	(await Image.loadAsync(source, { maxWidth: PREFETCH_WIDTH })).release();

/**
 * Reads an adventure, its progress and its map pictures ahead (Home does it for the stories on its
 * shelf), so opening the map paints at once. Nothing is read again when the cache already has it.
 */
export async function prefetchAdventure(id: string) {
	if (queryClient.getQueryData(adventureKey(id))) {
		return;
	}
	const a = await getAdventure(id);
	queryClient.setQueryData(adventureKey(id), a);
	remember(id, await getProgress(id));
	await Promise.allSettled(mapPictures(a).map(warm));
}

const keepIfSame =
	<T>(next: T) =>
	(prev: T | null): T =>
		prev !== null && JSON.stringify(prev) === JSON.stringify(next)
			? prev
			: next;

/**
 * An adventure and the child's progress. While any place is still being made the adventure is read
 * again every `pollAfterSec`, so cards turn ready in place. `onMediaError` is for a picture, clip or
 * narration that fails to load: its url has most likely expired, so the first failure reads the
 * adventure again for fresh ones.
 */
export function useAdventure(id: string) {
	// The last read of this adventure paints at once (map, place and choice each open it again).
	const [adventure, setAdventure] = useState<Adventure | null>(
		() => queryClient.getQueryData<Adventure>(adventureKey(id)) ?? null
	);
	const [progress, setProgress] = useState<Progress | null>(
		() => queryClient.getQueryData<Progress>(progressKey(id)) ?? null
	);

	useEffect(() => {
		let live = true;
		pollAdventure({
			isLive: () => live,
			onRead: (a) => {
				queryClient.setQueryData(adventureKey(id), a);
				setAdventure(keepIfSame(a));
				getProgress(id).then(
					(p) => live && setProgress(keepIfSame(remember(id, p)))
				);
			},
			read: () => getAdventure(id),
			sleep,
		});
		return () => {
			live = false;
		};
	}, [id]);

	const onMediaError = useMemo(
		() =>
			makeExpiryGuard(() => {
				reloadAdventure(id)
					.then(setAdventure)
					.catch(() => undefined);
			}),
		[id]
	);

	const visit = useCallback(
		async (node: NodeId) => {
			const p = remember(id, await visitNode(id, node));
			setProgress(p);
			return p;
		},
		[id]
	);

	return { adventure, onMediaError, progress, visit };
}
