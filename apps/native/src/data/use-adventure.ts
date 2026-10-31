import { useCallback, useEffect, useMemo, useState } from "react";
import {
	getAdventure,
	getProgress,
	reloadAdventure,
	visit as visitNode,
} from "./adventure-client";
import { makeExpiryGuard, pollAdventure } from "./engine-client";
import type { Adventure, NodeId, Progress } from "./types";

const sleep = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

/**
 * An adventure and the child's progress. While any place is still being made the adventure is read
 * again every `pollAfterSec`, so cards turn ready in place. `onMediaError` is for a picture, clip or
 * narration that fails to load: its url has most likely expired, so the first failure reads the
 * adventure again for fresh ones.
 */
export function useAdventure(id: string) {
	const [adventure, setAdventure] = useState<Adventure | null>(null);
	const [progress, setProgress] = useState<Progress | null>(null);

	useEffect(() => {
		let live = true;
		pollAdventure({
			isLive: () => live,
			onRead: (a) => {
				setAdventure(a);
				getProgress(id).then((p) => live && setProgress(p));
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
			const p = await visitNode(id, node);
			setProgress(p);
			return p;
		},
		[id]
	);

	return { adventure, onMediaError, progress, visit };
}
