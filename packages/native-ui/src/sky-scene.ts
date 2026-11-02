// The round 7 sky as data: what drifts where, how fast. Drawn by `sky.tsx` (one Skia canvas on
// iOS and Android) and `sky.web.tsx` (views with CSS animations on the web).
import { mulberry32 } from "./seeded-random";
import { layout } from "./tokens";

// Every size below is the round 7 page value (drawn at 0.72 scale), converted to points.
const SCALE = 0.72;
export const pt = (px: number) => px / SCALE;
// Round 7 phone screen width in its own px; horizontal travel scales with the real width.
const DRAW_WIDTH = layout.baseWidth * SCALE;

// Round 7 dims the sprites with CSS `brightness()` and `saturate()`. iOS draws `brightness` as a
// box over the whole view and has no `saturate`, so the dimming is baked into the files instead.
const bandFrontSprite = require("../assets/sky/cloud-band-front.webp"); // brightness .42, saturate .85
const bandBackSprite = require("../assets/sky/cloud-band-back.webp"); // brightness .38, saturate .85
const cloudTop = require("../assets/sky/cloud-1-dim.webp"); // brightness .62
const cloudRight = require("../assets/sky/cloud-2-dim.webp");
const cloudLeft = require("../assets/sky/cloud-4-dim.webp");

export type SkyEasing = "linear" | "ease-in-out";
interface Offset {
	x: number;
	y: number;
}
export interface Drift {
	alternate: boolean;
	delay: number; // seconds, negative = already under way
	duration: number; // seconds
	easing: SkyEasing;
	from: Offset;
	to: Offset;
}

/** "36%" of `size`. */
export const percentOf = (value: `${number}%`, size: number) =>
	(Number.parseFloat(value) / 100) * size;

// ---- Puffy clouds (round 7 `.sk .cl1 .cl2 .p .pr .pl .pt`) ----

export const BAND_TILES = 3; // round 7 band is 1332 px wide = 2.3 tiles; 3 covers it and any phone width

export interface BandLayer {
	bottom: number;
	delay: number;
	duration: number;
	height: number;
	opacity: number;
	sprite: number;
	tileWidth: number;
}

export const bandFront: BandLayer = {
	bottom: pt(-6), // .cl1 bottom
	delay: -18, // .cl1 --d
	duration: 70, // .cl1 --t
	height: pt(104),
	opacity: 0.85, // .cl1 opacity .85
	sprite: bandFrontSprite,
	tileWidth: pt(587),
};
export const bandBack: BandLayer = {
	bottom: pt(42), // .cl2 bottom
	delay: -60, // .cl2 --d
	duration: 112, // .cl2 --t
	height: pt(90),
	opacity: 0.45, // .cl2 opacity .45
	sprite: bandBackSprite,
	tileWidth: pt(509),
};

export interface Puff {
	alternate: boolean;
	delay: number;
	duration: number;
	dx: number; // horizontal travel as a fraction of the round 7 screen width
	easing: SkyEasing;
	height: number;
	horizontal: { left: number } | { right: number };
	image: number;
	opacity: number;
	startX: number; // fraction of the round 7 screen width
	top: `${number}%`;
	width: number;
}

const puffRight: Puff = {
	alternate: true,
	delay: -9,
	duration: 34,
	dx: -150 / DRAW_WIDTH,
	easing: "ease-in-out",
	height: pt(72),
	horizontal: { right: pt(-34) },
	image: cloudRight,
	opacity: 0.55, // .p opacity .55
	startX: 0,
	top: "36%",
	width: pt(120),
};
const puffLeft: Puff = {
	alternate: true,
	delay: -31,
	duration: 41,
	dx: -140 / DRAW_WIDTH,
	easing: "ease-in-out",
	height: pt(86),
	horizontal: { left: pt(-30) },
	image: cloudLeft,
	opacity: 0.38, // .pl opacity .38
	startX: 0,
	top: "20%",
	width: pt(104),
};
const puffTop: Puff = {
	alternate: false,
	delay: -40,
	duration: 95,
	dx: 460 / DRAW_WIDTH, // ptop: -130 px to 330 px
	easing: "linear",
	height: pt(62),
	horizontal: { left: 0 },
	image: cloudTop,
	opacity: 0.4, // .pt opacity .4
	startX: -130 / DRAW_WIDTH,
	top: "7%",
	width: pt(132),
};
/** Back to front. */
export const puffs = [puffTop, puffRight, puffLeft] as const;

export function bandDrift(layer: BandLayer): Drift {
	return {
		alternate: false,
		delay: layer.delay,
		duration: layer.duration,
		easing: "linear",
		from: { x: 0, y: 0 },
		to: { x: -layer.tileWidth, y: 0 }, // one tile per loop = seamless wrap
	};
}

/** pdrift: from (0, -6 px) to (dx, +8 px); ptop: straight across. */
export function puffDrift(puff: Puff, width: number): Drift {
	const k = width / DRAW_WIDTH;
	const vertical = puff.alternate;
	return {
		alternate: puff.alternate,
		delay: puff.delay,
		duration: puff.duration,
		easing: puff.easing,
		from: { x: puff.startX * DRAW_WIDTH * k, y: vertical ? pt(-6) : 0 },
		to: {
			x: (puff.startX + puff.dx) * DRAW_WIDTH * k,
			y: vertical ? pt(8) : 0,
		},
	};
}

// The band sprite is still opaque along its bottom row, so the back layer would end in a hard line
// 42 pt above the screen bottom. Instead of clipping the sprite, paint the sky's own colour back
// over its lower BAND_FADE pt, solid at the edge, so the layer dissolves into the sky.
export const BAND_FADE = pt(36);
export const BAND_FADE_OVERLAP = 2; // also cover the pt under the edge so no antialiased row survives

export function skyRgb(
	stops: readonly string[],
	locations: readonly number[],
	at: number
): string {
	const i = Math.max(
		1,
		locations.findIndex((l) => l >= at)
	);
	const start = locations[i - 1] ?? 0;
	const t = Math.min(
		1,
		Math.max(0, (at - start) / ((locations[i] ?? 1) - start))
	);
	const from = stops[i - 1] ?? "#000000";
	const to = stops[i] ?? from;
	return [1, 3, 5]
		.map((k) => {
			const a = Number.parseInt(from.slice(k, k + 2), 16);
			const b = Number.parseInt(to.slice(k, k + 2), 16);
			return Math.round(a + (b - a) * t);
		})
		.join(",");
}

// ---- Night and Twilight wisps (round 7 `.sk .w`) ----

export const wispTint: Record<"night" | "twilight", string> = {
	night: "190,212,255",
	twilight: "214,230,255",
};
export const wisps = [
	{ delay: -14, duration: 58, height: pt(92), top: "9%" },
	{ delay: -40, duration: 76, height: pt(120), top: "38%" },
	{ delay: -5, duration: 66, height: pt(100), top: "64%" },
] as const;
export const WISP_WIDTH = 1.7; // width: 170%
export const WISP_LEFT = -0.35; // left: -35%
export const WISP_TRAVEL = 0.14; // translateX -14% to 14% of the wisp's width
/** The wisp's radial gradient: centre, 62%, edge. */
export const wispStops = [
	{ at: 0, opacity: 0.2 },
	{ at: 0.62, opacity: 0.08 },
	{ at: 1, opacity: 0 },
] as const;

// ---- Stars (round 7 `.sk .s` and its `tw` twinkle): generated once, so nothing reshuffles ----

const STAR_COUNT = 34;
const STAR_SEED = 13; // round 7 uses rng(n * 97 + 13) for its first sky

export const stars = (() => {
	const random = mulberry32(STAR_SEED);
	return Array.from({ length: STAR_COUNT }, (_, id) => {
		const big = random() < 0.12;
		const size = pt(big ? 2.6 + random() * 0.9 : 1.2 + random() * 1.4);
		const left = `${(random() * 98).toFixed(1)}%` as `${number}%`;
		const top = `${(random() * 94).toFixed(1)}%` as `${number}%`; // the whole sky
		const duration = 2.4 + random() * 3.8;
		const delay = -(random() * 8); // negative: stars start mid-cycle
		return { delay, duration, id, left, size, top };
	});
})();
export type Star = (typeof stars)[number];

/** The twinkle (round 7 `tw`): dim and small at 0% and 100%, bright and a little big at 50%. */
export const twinkleFrom = { opacity: 0.1, scale: 0.6 };
export const twinkleTo = { opacity: 1, scale: 1.15 };
export const STAR_CALM_OPACITY = 0.75;
/** The glow is a CSS `0 0 (size * 2.5) rgba(255,255,255,.75)` box shadow. */
export const STAR_GLOW_BLUR = 2.5;
export const STAR_GLOW = "rgba(255,255,255,0.75)";
