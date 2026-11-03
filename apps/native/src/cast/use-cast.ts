// Native (iOS and Android) cast session. use-cast.web.ts has the same two hooks for Chrome.

import { useCallback, useEffect, useRef, useState } from "react";
import {
	CastState,
	MediaPlayerState,
	MediaStreamType,
	useCastDevice,
	useCastState,
	useMediaStatus,
	useRemoteMediaClient,
	useStreamPosition,
} from "react-native-google-cast";
import type { TvMedia, TvRemote } from "./types";

// How often the TV's position is reported, in seconds: often enough for the words to follow.
const POSITION_TICK_SEC = 0.25;
const VIDEO_TYPE = "video/mp4";
const BUSY: (MediaPlayerState | null)[] = [
	MediaPlayerState.PLAYING,
	MediaPlayerState.BUFFERING,
	MediaPlayerState.LOADING,
];

/** True while a cast session is connected. Cheap: safe to call wherever the screen needs it. */
export function useCastConnected(): boolean {
	return useCastState() === CastState.CONNECTED;
}

/** The connected TV. Call it only where the video is shown: it owns the position listener. */
export function useTvRemote(): TvRemote {
	const client = useRemoteMediaClient();
	const device = useCastDevice();
	const status = useMediaStatus();
	const position = useStreamPosition(POSITION_TICK_SEC);
	const [ended, setEnded] = useState(false);
	const watching = useRef<{ remove: () => void } | null>(null);

	useEffect(() => () => watching.current?.remove(), []);

	const load = useCallback(
		async (media: TvMedia) => {
			if (!client) {
				throw new Error("No TV connected");
			}
			watching.current?.remove();
			setEnded(false);
			await client.loadMedia({
				autoplay: true,
				mediaInfo: {
					contentType: VIDEO_TYPE,
					contentUrl: media.url,
					metadata: {
						images: media.posterUrl ? [{ url: media.posterUrl }] : [],
						title: media.title,
						type: "generic",
					},
					streamDuration: media.durationSec,
					streamType: MediaStreamType.BUFFERED,
				},
			});
			// Listening starts after the load, so a status left from the last place is never read.
			watching.current = client.onMediaPlaybackEnded(() => setEnded(true));
		},
		[client]
	);

	const playing = BUSY.includes(status?.playerState ?? null);
	const toggle = useCallback(() => {
		if (playing) {
			client?.pause();
		} else {
			client?.play();
		}
	}, [client, playing]);
	const stop = useCallback(() => {
		client?.stop().catch(() => undefined);
	}, [client]);

	return {
		deviceName: device?.friendlyName ?? null,
		ended,
		load,
		playing,
		position: position ?? 0,
		stop,
		toggle,
	};
}
