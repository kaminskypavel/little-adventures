"use client";

// One looping video of a character with a transparent background, plus the
// helpers that start and stop it. A take never loads anything by itself: the
// story stage sets its source and calls play() when its beat comes up.
// One file per engine: HEVC with alpha for Safari, VP9 with alpha for the
// rest. The source is picked in the browser only, never during render.

import type { BeatId } from "./beats";

// WebKit only. Other engines can decode HEVC but drop its alpha layer.
const SAFARI_ENGINE = /^(?:(?!chrome|chromium|android|crios|fxios).)*safari/iu;

// Same value as OFF below, spelled out so Tailwind sees the class.
const HIDDEN_TAKE = "opacity-[0.01]";

interface CastTakeProps {
	/** Beats where this take plays. */
	beats: readonly BeatId[];
	className?: string;
	/** `boy-watch`, `girl-walk`, `star-idle`: the file name without extension. */
	name: string;
	/** Keep the poster visible when motion is reduced. Takes of the first beat always do. */
	still?: boolean;
	/** Plays once, then hands over to the take with this name in the same box. */
	then?: string;
}

/** Opacity of a take that is not showing. Chrome stops painting a video at 0. */
export const OFF = 0.01;

/** True when the take plays on this beat. */
export function listed(video: Element, id: BeatId) {
	return (video.getAttribute("data-beats") ?? "").split(" ").includes(id);
}

/**
 * True when the take plays on this beat and is on show. A take that follows a
 * once-take (`then`) waits, hidden and parked, until that take is done.
 */
export function onShow(video: Element, takes: readonly Element[], id: BeatId) {
	const name = video.getAttribute("data-take");
	return (
		listed(video, id) &&
		!takes.some(
			(other) => listed(other, id) && other.getAttribute("data-then") === name
		)
	);
}

function attachSrc(video: HTMLVideoElement) {
	if (video.getAttribute("src")) {
		return;
	}
	const ext = SAFARI_ENGINE.test(navigator.userAgent) ? "mov" : "webm";
	video.src = `${video.dataset.base}.${ext}`;
}

function nextOf(video: HTMLVideoElement) {
	return video.parentElement?.querySelector<HTMLVideoElement>(
		`video[data-take="${video.dataset.then}"]`
	);
}

function playTake(video: HTMLVideoElement) {
	attachSrc(video);
	video.style.visibility = "";
	if (video.dataset.then) {
		// Starting over: the take that follows hides again until this one is done.
		video.currentTime = 0;
		const next = nextOf(video);
		if (next) {
			next.style.opacity = String(OFF);
		}
	}
	// Muted and inline, so call play() directly. Waiting for loaded data
	// or priming with play-then-pause stalls iOS Safari.
	video.play().catch(() => undefined);
}

function parkTake(video: HTMLVideoElement) {
	attachSrc(video);
	video.pause();
	if (video.currentTime > 0) {
		video.currentTime = 0;
	}
}

/**
 * Starts the takes of one beat and stops the rest. Takes of the next beat get
 * their source so they are ready, but do not play.
 */
export function syncTakes(stage: HTMLElement, id: BeatId, next?: BeatId) {
	const videos = [
		...stage.querySelectorAll<HTMLVideoElement>("video[data-beats]"),
	];
	for (const video of videos) {
		if (!listed(video, id)) {
			video.pause();
			if (next && listed(video, next)) {
				attachSrc(video);
			}
		} else if (onShow(video, videos, id)) {
			playTake(video);
		} else {
			parkTake(video);
		}
	}
}

/** Pauses every take. For cleanup. */
export function stopTakes(stage: HTMLElement) {
	for (const video of stage.querySelectorAll("video")) {
		video.pause();
	}
}

export function CastTake({
	beats,
	className = "",
	name,
	still = false,
	then,
}: CastTakeProps) {
	const isStar = name.startsWith("star-");
	const dir = isStar ? "/star" : "/cast";
	const first = beats.includes("hello");
	const reduced = still ? "motion-reduce:opacity-100" : "motion-reduce:hidden";
	const hidden = first ? "" : `${HIDDEN_TAKE} ${reduced}`;

	return (
		<video
			aria-hidden="true"
			className={`absolute inset-0 aspect-square size-full ${hidden} ${className}`}
			data-base={`${dir}/${name}`}
			data-beats={beats.join(" ")}
			data-take={name}
			data-then={then}
			disablePictureInPicture
			disableRemotePlayback
			loop={!then}
			muted
			playsInline
			poster={isStar ? "/star/star-rest.webp" : `${dir}/${name}.webp`}
			preload="none"
			ref={(video) => {
				if (!(video && then)) {
					return;
				}
				// Hand over to the next take once this one is done. If that take
				// refuses to play, this one holds its last frame, the same pose.
				const handOver = () => {
					const next = nextOf(video);
					if (!next) {
						return;
					}
					next.currentTime = 0;
					next.style.opacity = "1";
					next.play().then(
						() => {
							video.style.visibility = "hidden";
						},
						() => undefined
					);
				};
				video.addEventListener("ended", handOver);
				video.addEventListener("error", handOver);
				return () => {
					video.removeEventListener("ended", handOver);
					video.removeEventListener("error", handOver);
				};
			}}
			tabIndex={-1}
		/>
	);
}
