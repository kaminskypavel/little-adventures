import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Language, languageNow, useLanguage } from "@/src/i18n";
import {
	getAdventure,
	getProgress,
	reloadAdventure,
	visit as visitNode,
} from "./adventure-client";
import { makeExpiryGuard, pollAdventure, sleep } from "./engine-client";
import { useMusic } from "./music-store";
import { queryClient } from "./query-client";
import { useReplay } from "./replay-store";
import type { Adventure, NodeId, Progress } from "./types";

// In the shared cache, which signing out clears.
// The adventure is read in the chosen language, so each language has its own entry.
const adventureKey = (id: string, language: Language) =>
	["adventure", id, language] as const;
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

/**
 * Loads a picture through the image cache under its own cache key. The returned ref is dropped, not
 * released: release() frees the decoded image the cache shares with any view showing it, so a
 * picture on screen would vanish.
 */
const warm = async (source: { cacheKey?: string; uri: string }) => {
	await Image.loadAsync(source, { maxWidth: PREFETCH_WIDTH });
};

/**
 * Reads an adventure, its progress and its map pictures ahead (Home does it for the stories on its
 * shelf), so opening the map paints at once. Nothing is read again when the cache already has it.
 */
export async function prefetchAdventure(id: string) {
	const language = languageNow();
	if (queryClient.getQueryData(adventureKey(id, language))) {
		return;
	}
	const a = await getAdventure(id, language);
	queryClient.setQueryData(adventureKey(id, language), a);
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
	const language = useLanguage();
	// The last read of this adventure paints at once (map, place and choice each open it again).
	const [adventure, setAdventure] = useState<Adventure | null>(
		() =>
			queryClient.getQueryData<Adventure>(adventureKey(id, language)) ?? null
	);
	const [progress, setProgress] = useState<Progress | null>(
		() => queryClient.getQueryData<Progress>(progressKey(id)) ?? null
	);

	// A replay on this phone stands in for the stored progress on every screen that reads it.
	const replay = useReplay((s) => s.byId[id]);

	// The language changing (Grown-ups) reads the adventure again in the new one.
	useEffect(() => {
		let live = true;
		setAdventure(
			(prev) =>
				queryClient.getQueryData<Adventure>(adventureKey(id, language)) ?? prev
		);
		pollAdventure({
			isLive: () => live,
			onRead: (a) => {
				queryClient.setQueryData(adventureKey(id, language), a);
				setAdventure(keepIfSame(a));
				getProgress(id).then(
					(p) => live && setProgress(keepIfSame(remember(id, p)))
				);
			},
			read: () => getAdventure(id, language),
			sleep,
		});
		return () => {
			live = false;
		};
	}, [id, language]);

	// The music bed follows the adventure on every screen that reads it; the same adventure and url
	// again change nothing, so moving between map, place and choice never restarts it.
	const adventureId = adventure?.id;
	const musicUrl = adventure?.music?.url ?? null;
	useEffect(() => {
		if (adventureId) {
			useMusic.getState().start(adventureId, musicUrl);
		}
	}, [adventureId, musicUrl]);

	const onMediaError = useMemo(
		() =>
			makeExpiryGuard(() => {
				reloadAdventure(id, language)
					.then(setAdventure)
					.catch(() => undefined);
			}),
		[id, language]
	);

	const visit = useCallback(
		async (node: NodeId) => {
			const p = remember(id, await visitNode(id, node));
			setProgress(p);
			return useReplay.getState().step(id, node) ?? p;
		},
		[id]
	);

	return { adventure, onMediaError, progress: replay ?? progress, visit };
}
