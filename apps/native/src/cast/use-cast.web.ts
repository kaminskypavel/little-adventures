// Chrome cast session, on the Cast Web Sender SDK and the default receiver. Same two hooks as
// use-cast.ts. The session lives in one small store, because the SDK has one player for the page.
import { useCallback, useEffect } from "react";
import { create } from "zustand";
import {
	SUBTITLE_STYLE,
	SUBTITLE_TRACK,
	type TvMedia,
	type TvRemote,
} from "./types";

const SDK_URL =
	"https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
const VIDEO_TYPE = "video/mp4";
const NO_DEVICES = "NO_DEVICES_AVAILABLE";
const BUSY = new Set(["PLAYING", "BUFFERING"]);

// The part of the Cast Web Sender SDK used here. The SDK is a script, so it has no module types.
interface RemotePlayer {
	currentTime: number;
	isConnected: boolean;
	playerState: string | null;
}
interface CastSession {
	getCastDevice: () => { friendlyName: string };
	getMediaSession: () => { idleReason: string | null } | null;
	loadMedia: (request: unknown) => Promise<unknown>;
}
interface Events {
	addEventListener: (type: string, listener: () => void) => void;
}
interface CastSdk {
	cast: {
		framework: {
			CastContext: {
				getInstance: () => Events & {
					getCastState: () => string;
					getCurrentSession: () => CastSession | null;
					requestSession: () => Promise<unknown>;
					setOptions: (options: Record<string, unknown>) => void;
				};
			};
			CastContextEventType: {
				CAST_STATE_CHANGED: string;
				SESSION_STATE_CHANGED: string;
			};
			RemotePlayer: new () => RemotePlayer;
			RemotePlayerController: new (
				player: RemotePlayer
			) => Events & {
				playOrPause: () => void;
				stop: () => void;
			};
			RemotePlayerEventType: { ANY_CHANGE: string };
		};
	};
	chrome: {
		cast: {
			AutoJoinPolicy: { ORIGIN_SCOPED: string };
			Image: new (url: string) => unknown;
			media: {
				DEFAULT_MEDIA_RECEIVER_APP_ID: string;
				GenericMediaMetadata: new () => { images: unknown[]; title: string };
				LoadRequest: new (info: unknown) => { activeTrackIds: number[] | null };
				MediaInfo: new (url: string, type: string) => Record<string, unknown>;
				TextTrackStyle: new () => Record<string, unknown>;
				TextTrackType: { SUBTITLES: string };
				Track: new (id: number, type: string) => Record<string, unknown>;
				TrackType: { TEXT: string };
			};
		};
	};
}
type CastWindow = Window &
	Partial<CastSdk> & {
		__onGCastApiAvailable?: (available: boolean) => void;
	};

interface Store {
	/** The SDK loaded and Chrome can cast; false in other browsers and while it loads. */
	available: boolean;
	connected: boolean;
	deviceName: string | null;
	/** At least one TV is on the network. */
	devices: boolean;
	ended: boolean;
	playing: boolean;
	position: number;
}
const useStore = create<Store>(() => ({
	available: false,
	connected: false,
	deviceName: null,
	devices: false,
	ended: false,
	playing: false,
	position: 0,
}));

let sdk: CastSdk | null = null;
let player: RemotePlayer | null = null;
let controller: InstanceType<
	CastSdk["cast"]["framework"]["RemotePlayerController"]
> | null = null;
// Set by load(): the receiver's "finished" counts only for the video this page started.
let loaded = false;

const context = () => sdk?.cast.framework.CastContext.getInstance() ?? null;

function sync() {
	const session = context()?.getCurrentSession() ?? null;
	const state = player?.playerState ?? null;
	useStore.setState({
		connected: player?.isConnected ?? false,
		deviceName: session?.getCastDevice().friendlyName ?? null,
		devices: context()?.getCastState() !== NO_DEVICES,
		ended:
			loaded &&
			state === "IDLE" &&
			session?.getMediaSession()?.idleReason === "FINISHED",
		playing: state !== null && BUSY.has(state),
		position: player?.currentTime ?? 0,
	});
}

function start(found: CastSdk) {
	sdk = found;
	const {
		CastContext,
		CastContextEventType,
		RemotePlayer,
		RemotePlayerController,
		RemotePlayerEventType,
	} = found.cast.framework;
	const cast = CastContext.getInstance();
	cast.setOptions({
		autoJoinPolicy: found.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
		receiverApplicationId:
			found.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
	});
	player = new RemotePlayer();
	controller = new RemotePlayerController(player);
	controller.addEventListener(RemotePlayerEventType.ANY_CHANGE, sync);
	cast.addEventListener(CastContextEventType.CAST_STATE_CHANGED, sync);
	cast.addEventListener(CastContextEventType.SESSION_STATE_CHANGED, sync);
	useStore.setState({ available: true });
	sync();
}

let requested = false;
/** Loads the SDK once. Only Chrome (and browsers built on it) ends up `available`. */
function loadSdk() {
	if (requested || typeof document === "undefined") {
		return;
	}
	requested = true;
	const host = window as CastWindow;
	host.__onGCastApiAvailable = (available) => {
		if (available && host.cast && host.chrome) {
			start(host as unknown as CastSdk);
		}
	};
	const script = document.createElement("script");
	script.async = true;
	script.src = SDK_URL;
	document.head.append(script);
}

/** Opens Chrome's "Cast to" list. */
export const pickTv = () =>
	context()
		?.requestSession()
		.catch(() => undefined);

/** Whether to show the Cast button: the SDK is ready and a TV is on the network. */
export function useCastAvailable(): boolean {
	useEffect(loadSdk, []);
	return useStore((s) => s.available && s.devices);
}

/** True while a cast session is connected. */
export function useCastConnected(): boolean {
	useEffect(loadSdk, []);
	return useStore((s) => s.connected);
}

export function useTvRemote(): TvRemote {
	const deviceName = useStore((s) => s.deviceName);
	const ended = useStore((s) => s.ended);
	const playing = useStore((s) => s.playing);
	const position = useStore((s) => s.position);
	const load = useCallback(async (media: TvMedia) => {
		const session = context()?.getCurrentSession();
		if (!(sdk && session)) {
			throw new Error("No TV connected");
		}
		const { chrome } = sdk;
		const info = new chrome.cast.media.MediaInfo(media.url, VIDEO_TYPE);
		const metadata = new chrome.cast.media.GenericMediaMetadata();
		metadata.title = media.title;
		if (media.posterUrl) {
			metadata.images = [new chrome.cast.Image(media.posterUrl)];
		}
		info.metadata = metadata;
		info.duration = media.durationSec;
		info.streamType = "BUFFERED";
		const request = new chrome.cast.media.LoadRequest(info);
		if (media.subtitlesUrl) {
			const { Track, TrackType, TextTrackStyle, TextTrackType } =
				chrome.cast.media;
			const track = new Track(SUBTITLE_TRACK.id, TrackType.TEXT);
			track.trackContentId = media.subtitlesUrl;
			track.trackContentType = SUBTITLE_TRACK.contentType;
			track.subtype = TextTrackType.SUBTITLES;
			track.language = SUBTITLE_TRACK.language;
			track.name = SUBTITLE_TRACK.name;
			info.tracks = [track];
			info.textTrackStyle = Object.assign(new TextTrackStyle(), SUBTITLE_STYLE);
			request.activeTrackIds = [SUBTITLE_TRACK.id];
		}
		loaded = false;
		useStore.setState({ ended: false });
		await session.loadMedia(request);
		loaded = true;
	}, []);
	const toggle = useCallback(() => controller?.playOrPause(), []);
	const stop = useCallback(() => controller?.stop(), []);
	return { deviceName, ended, load, playing, position, stop, toggle };
}
