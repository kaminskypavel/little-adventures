"use client";

// The star companion as a looping video with a transparent background.
// One file per engine: HEVC with alpha for Safari, VP9 with alpha for the
// rest. The source is picked in the browser only, never during render.

export type StarTakeName =
	| "idle"
	| "wave"
	| "jump"
	| "listen"
	| "think"
	| "clap"
	| "point"
	| "goodnight";

// WebKit only. Other engines can decode HEVC but drop its alpha layer.
const SAFARI_ENGINE = /^(?:(?!chrome|chromium|android|crios|fxios).)*safari/iu;
const PREFERS_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function attach(video: HTMLVideoElement | null, take: StarTakeName) {
	if (!video || window.matchMedia(PREFERS_REDUCED_MOTION).matches) {
		return;
	}
	const ext = SAFARI_ENGINE.test(navigator.userAgent) ? "mov" : "webm";
	const src = `/star/star-${take}.${ext}`;
	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry?.isIntersecting) {
				video.pause();
				return;
			}
			if (video.getAttribute("src") !== src) {
				video.src = src;
			}
			// Muted and inline, so call play() directly. Waiting for loaded data
			// or priming with play-then-pause stalls iOS Safari.
			video.play().catch(() => undefined);
		},
		{ rootMargin: "200px" }
	);
	observer.observe(video);
	return () => observer.disconnect();
}

export function StarTake({
	take = "idle",
	className,
}: {
	take?: StarTakeName;
	className?: string;
}) {
	return (
		<video
			aria-hidden="true"
			autoPlay
			className={`aspect-square ${className ?? ""}`}
			disablePictureInPicture
			disableRemotePlayback
			loop
			muted
			playsInline
			poster="/star/star-rest.webp"
			ref={(video) => attach(video, take)}
			tabIndex={-1}
		/>
	);
}
