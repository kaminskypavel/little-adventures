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
import {
	SUBTITLE_STYLE,
	SUBTITLE_TRACK,
	type TvImage,
	type TvMedia,
	type TvRemote,
} from "./types";

// How often the TV's position is reported, in seconds: often enough for the words to follow.
const POSITION_TICK_SEC = 0.25;
const VIDEO_TYPE = "video/mp4";
const IMAGE_TYPE = "image/jpeg";
const BUSY: (MediaPlayerState | null)[] = [
	MediaPlayerState.PLAYING,
	MediaPlayerState.BUFFERING,
	MediaPlayerState.LOADING,
];

/** True while a cast session is connected. Cheap: safe to call wherever the screen needs it. */
export function useCastConnected(): boolean {
	return useCastState() === CastState.CONNECTED;
}

/**
 * Shows a still picture on the connected TV. Rejects when no TV is connected or it refuses.
 * Separate from useTvRemote: that one re-renders its screen with the TV's position.
 */
export function useTvImage(): (image: TvImage) => Promise<void> {
	const client = useRemoteMediaClient();
	return useCallback(
		async (image: TvImage) => {
			if (!client) {
				throw new Error("No TV connected");
			}
			await client.loadMedia({
				autoplay: true,
				mediaInfo: {
					contentType: IMAGE_TYPE,
					contentUrl: image.url,
					metadata: { images: [], title: image.title, type: "photo" },
					streamType: MediaStreamType.BUFFERED,
				},
			});
		},
		[client]
	);
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
					mediaTracks: media.subtitlesUrl
						? [
								{
									contentId: media.subtitlesUrl,
									contentType: SUBTITLE_TRACK.contentType,
									id: SUBTITLE_TRACK.id,
									language: SUBTITLE_TRACK.language,
									name: SUBTITLE_TRACK.name,
									subtype: "subtitles",
									type: "text",
								},
							]
						: [],
					metadata: {
						images: media.posterUrl ? [{ url: media.posterUrl }] : [],
						title: media.title,
						type: "generic",
					},
					streamDuration: media.durationSec,
					streamType: MediaStreamType.BUFFERED,
					textTrackStyle: media.subtitlesUrl ? SUBTITLE_STYLE : null,
				},
			});
			if (media.subtitlesUrl) {
				// The library's load request has no activeTrackIds, so the track is switched on after.
				await client
					.setActiveTrackIds([SUBTITLE_TRACK.id])
					.catch(() => undefined);
			}
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
