// Parts that are about to be needed, loading before their place opens. A warm player has no view:
// it only fills its buffer. The place opens with its own players; these are let go as it opens.
import { createVideoPlayer, type VideoPlayer } from "expo-video";

const warm = new Map<string, VideoPlayer>();

/** Starts loading one part's file. Safe to call again for the same url. */
export function warmPart(url: string) {
	if (warm.has(url)) {
		return;
	}
	const player = createVideoPlayer(url);
	player.muted = true;
	warm.set(url, player);
}

/** Warms exactly these urls and lets every other warm player go. */
export function keepWarm(urls: readonly string[]) {
	const keep = new Set(urls);
	for (const [url, player] of warm) {
		if (!keep.has(url)) {
			player.release();
			warm.delete(url);
		}
	}
	for (const url of keep) {
		warmPart(url);
	}
}

/** Lets every warm player go (the adventure is over). */
export const releaseWarm = () => keepWarm([]);
