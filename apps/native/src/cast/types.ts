/** The place as one video for the TV, with what the TV screen shows while it plays. */
export interface TvMedia {
	durationSec: number;
	posterUrl: string | null;
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
	/** Stops the TV's video (the child left the place). */
	stop: () => void;
	toggle: () => void;
}
