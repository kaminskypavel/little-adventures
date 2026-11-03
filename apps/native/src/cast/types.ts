import { LANGUAGES, type Language, languageNow } from "@/src/i18n";

/** The place as one video for the TV, with what the TV screen shows while it plays. */
export interface TvMedia {
	durationSec: number;
	posterUrl: string | null;
	/** WebVTT read-along words, timed to the video. Null: no words, no subtitle track. */
	subtitlesUrl: string | null;
	title: string;
	url: string;
}

/** A still picture for the TV, e.g. the map. */
export interface TvImage {
	title: string;
	url: string;
}

/** The TV once a cast session is connected: load a video, then follow it. */
export interface TvRemote {
	/** Name of the TV, e.g. "Living room TV". Null until the session reports it. */
	deviceName: string | null;
	/** True once the TV has played the loaded video to its end. */
	ended: boolean;
	/** Starts the video on the TV. Rejects when the TV refuses it. */
	load: (media: TvMedia) => Promise<void>;
	playing: boolean;
	/** Seconds into the video on the TV. */
	position: number;
	/** True once the phone can talk to the TV: wait for it before loading. */
	ready: boolean;
	/** Stops the TV's video (the child left the place). */
	stop: () => void;
	toggle: () => void;
}

/**
 * The one subtitle track on the TV (id 1, WebVTT). Its language is the app's: the adventure is read
 * in it, so the words on the TV are too. The getters read it each time a video is loaded.
 */
export const SUBTITLE_TRACK = {
	contentType: "text/vtt",
	id: 1,
	get language(): Language {
		return languageNow();
	},
	get name() {
		return LANGUAGES.find((l) => l.code === languageNow())?.name ?? "English";
	},
};

/** Words a child can read from the sofa: white on a dark translucent box, big. Colors are #RRGGBBAA. */
export const SUBTITLE_STYLE = {
	backgroundColor: "#000000B3",
	fontScale: 1.8,
	foregroundColor: "#FFFFFFFF",
} as const;
