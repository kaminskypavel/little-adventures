"use client";

// One looping video of a character with a transparent background, plus the
// helpers that start and stop it. A take never loads anything by itself: the
// story stage sets its source and calls play() when its slide comes up.
// One file per engine: HEVC with alpha for Safari, VP9 with alpha for the
// rest. The source is picked in the browser only, never during render.

import type { SlideId } from "./slides";

// WebKit only. Other engines can decode HEVC but drop its alpha layer.
const SAFARI_ENGINE = /^(?:(?!chrome|chromium|android|crios|fxios).)*safari/iu;

// Same value as OFF below, spelled out so Tailwind sees the class.
const HIDDEN_TAKE = "opacity-[0.01]";

interface CastTakeProps {
	className?: string;
	/** `boy-watch`, `girl-float`, `star-idle`: the file name without extension. */
	name: string;
	/** Slides where this take plays. */
	slides: readonly SlideId[];
	/** Plays once, then hands over to the take with this name in the same box. */
	then?: string;
}

/** Poster of a take: its transparent first frame. All star takes share one. */
export function posterOf(name: string) {
	return name.startsWith("star-")
		? "/star/star-rest.webp"
		: `/cast/${name}.webp`;
}

/** Opacity of a take that is not showing. Chrome stops painting a video at 0. */
export const OFF = 0.01;

/** True when the take plays on this slide. */
export function listed(video: Element, id: SlideId) {
	return (video.getAttribute("data-slides") ?? "").split(" ").includes(id);
}

/**
 * True when the take plays on this slide and is on show. A take that follows a
 * once-take (`then`) waits, hidden and parked, until that take is done.
 */
export function onShow(video: Element, takes: readonly Element[], id: SlideId) {
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
 * Starts the takes of one slide and stops the rest. Takes of the next slide get
 * their source so they are ready, but do not play.
 */
export function syncTakes(stage: HTMLElement, id: SlideId, next?: SlideId) {
	const videos = [
		...stage.querySelectorAll<HTMLVideoElement>("video[data-slides]"),
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
	className = "",
	name,
	slides,
	then,
}: CastTakeProps) {
	const isStar = name.startsWith("star-");
	const dir = isStar ? "/star" : "/cast";
	const hidden = slides.includes("hello") ? "" : HIDDEN_TAKE;

	return (
		<video
			aria-hidden="true"
			className={`absolute inset-0 aspect-square size-full ${hidden} ${className}`}
			data-base={`${dir}/${name}`}
			data-slides={slides.join(" ")}
			data-take={name}
			data-then={then}
			disablePictureInPicture
			disableRemotePlayback
			loop={!then}
			muted
			playsInline
			poster={posterOf(name)}
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
