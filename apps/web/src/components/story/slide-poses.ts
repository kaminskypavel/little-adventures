import type { SlideId } from "./slides";

// Where everything on the stage stands on each slide, and which take each
// video actor plays. To re-direct a slide, edit its entry in WIDE and NARROW.
//
// A pose is the target of a slide, never a move from the previous slide: any
// slide can go to any slide. Its numbers are offsets from the actor's resting
// place, which is its CSS position in story-slides.tsx:
//   x, y   percent of the stage width and height (positive is right and down)
//   s, r   scale and rotation in degrees
//   alpha  opacity, 0 hides the actor
// The clouds are outside the stage: their y is percent of the window height.

export type Layout = "narrow" | "wide";

export type ActorId =
	| "boy"
	| "bubble"
	| "clouds"
	| "dim"
	| "girl"
	| "moonCrescent"
	| "moonHammock"
	| "planetA"
	| "planetB"
	| "star";

/** The actors that live on the stage. The clouds and the dim layer sit outside it. */
export type StageActor = Exclude<ActorId, "clouds" | "dim">;

export interface Pose {
	alpha?: number;
	r?: number;
	s?: number;
	/** Overrides for the move of this actor on this slide. Seconds. */
	tween?: { delay?: number; duration?: number; ease?: string };
	x?: number;
	y?: number;
}

export type Poses = Record<ActorId, Pose>;

/** The actors that play video, in stacking order. */
export type VideoActor = "boy" | "girl" | "star";

/**
 * The takes each video actor shows on each slide. A list plays in order: the
 * first take once, then the second, which loops. Takes of the same pose start
 * and end on the same frame, so they swap with a quick cross-fade.
 */
export const takeFor: Record<SlideId, Record<VideoActor, readonly string[]>> = {
	ask: { boy: ["boy-ask"], girl: ["girl-watch"], star: ["star-listen"] },
	choose: { boy: ["boy-point"], girl: ["girl-reach"], star: ["star-point"] },
	goodnight: {
		boy: ["boy-sleep"],
		girl: ["girl-sleep"],
		star: ["star-goodnight"],
	},
	hello: { boy: ["boy-watch"], girl: ["girl-watch"], star: ["star-idle"] },
	liftoff: {
		boy: ["boy-float"],
		girl: ["girl-float"],
		star: ["star-jump", "star-idle"],
	},
};

export interface TakeSpec {
	/** Hands over to this take once it is done. Only the first of a list has one. */
	handTo?: string;
	name: string;
	/** Slides where this take is on show. */
	slides: SlideId[];
}

/** Every take of one actor, with the slides it plays on. Same order as `takeFor`. */
export function takesOf(actor: VideoActor): TakeSpec[] {
	const specs = new Map<string, TakeSpec>();
	for (const [slide, byActor] of Object.entries(takeFor) as [
		SlideId,
		Record<VideoActor, readonly string[]>,
	][]) {
		for (const [index, name] of byActor[actor].entries()) {
			const spec = specs.get(name) ?? { name, slides: [] };
			spec.slides.push(slide);
			if (index === 0 && byActor[actor].length > 1) {
				spec.handTo = byActor[actor][1];
			}
			specs.set(name, spec);
		}
	}
	return [...specs.values()];
}

// ---- Shared poses ----

const HERE: Pose = {};
const GONE: Pose = { alpha: 0 };
const BUBBLE_GONE: Pose = {
	alpha: 0,
	s: 0.6,
	tween: { duration: 0.2, ease: "power2.in" },
};
const BUBBLE_POP: Pose = {
	tween: { delay: 0.45, duration: 0.35, ease: "brandOvershoot" },
};
const PLANET_GONE: Pose = { alpha: 0, s: 0.7, y: 6 };
const CLOUDS_HERE: Pose = { alpha: 1, y: 0 };
const CLOUDS_AWAY: Pose = { alpha: 0, y: 45 };

// ---- Wide: the split, text left and a 56vw stage right ----

const WIDE_MOON_NEAR: Pose = { s: 2.1, x: -13.3, y: 4.1 };

const WIDE: Record<SlideId, Poses> = {
	ask: {
		boy: HERE,
		bubble: BUBBLE_POP,
		clouds: CLOUDS_HERE,
		dim: GONE,
		girl: HERE,
		moonCrescent: { alpha: 0.9 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: { x: 7, y: 3 },
	},
	choose: {
		boy: HERE,
		bubble: BUBBLE_GONE,
		clouds: CLOUDS_AWAY,
		dim: GONE,
		girl: HERE,
		moonCrescent: { ...WIDE_MOON_NEAR, alpha: 0 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: HERE,
		planetB: HERE,
		star: { y: -6 },
	},
	goodnight: {
		boy: { s: 0.65, x: 6.2, y: -12.9 },
		bubble: BUBBLE_GONE,
		clouds: { alpha: 0.7, y: 0 },
		dim: { alpha: 1 },
		girl: { s: 0.65, x: -6.2, y: -10.9 },
		moonCrescent: { ...WIDE_MOON_NEAR, alpha: 0 },
		moonHammock: HERE,
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: { s: 0.5, x: 26.5, y: -16 },
	},
	hello: {
		boy: HERE,
		bubble: BUBBLE_GONE,
		clouds: CLOUDS_HERE,
		dim: GONE,
		girl: HERE,
		moonCrescent: { alpha: 0.9 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: HERE,
	},
	liftoff: {
		boy: { y: -10 },
		bubble: BUBBLE_GONE,
		clouds: CLOUDS_AWAY,
		dim: GONE,
		girl: { y: -10 },
		moonCrescent: { ...WIDE_MOON_NEAR, alpha: 0.9 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: { y: -18 },
	},
};

// ---- Narrow: text on top, the stage below ----

const NARROW_MOON_NEAR: Pose = { s: 1.6, x: 2, y: -1 };

const NARROW: Record<SlideId, Poses> = {
	ask: {
		boy: HERE,
		bubble: BUBBLE_POP,
		clouds: CLOUDS_HERE,
		dim: GONE,
		girl: HERE,
		moonCrescent: { alpha: 0 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: HERE,
	},
	choose: {
		boy: HERE,
		bubble: BUBBLE_GONE,
		clouds: CLOUDS_AWAY,
		dim: GONE,
		girl: HERE,
		moonCrescent: { ...NARROW_MOON_NEAR, alpha: 0 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: HERE,
		planetB: HERE,
		star: HERE,
	},
	goodnight: {
		boy: { s: 0.56, x: 10.5, y: -15 },
		bubble: BUBBLE_GONE,
		clouds: { alpha: 0.7, y: 0 },
		dim: { alpha: 1 },
		girl: { s: 0.56, x: -10.3, y: -14 },
		moonCrescent: { ...NARROW_MOON_NEAR, alpha: 0 },
		moonHammock: HERE,
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: { s: 0.5, x: 30, y: -12 },
	},
	hello: {
		boy: HERE,
		bubble: BUBBLE_GONE,
		clouds: CLOUDS_HERE,
		dim: GONE,
		girl: HERE,
		moonCrescent: { alpha: 0 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: HERE,
	},
	liftoff: {
		boy: { y: -11 },
		bubble: BUBBLE_GONE,
		clouds: CLOUDS_AWAY,
		dim: GONE,
		girl: { y: -11 },
		moonCrescent: { ...NARROW_MOON_NEAR, alpha: 0.9 },
		moonHammock: { alpha: 0, y: 14 },
		planetA: PLANET_GONE,
		planetB: PLANET_GONE,
		star: { x: -6, y: -6 },
	},
};

export const slidePoses: Record<Layout, Record<SlideId, Poses>> = {
	narrow: NARROW,
	wide: WIDE,
};
