import { gsap } from "@/lib/gsap";
import { type Beat, type BeatId, beats } from "./beats";
import { OFF, onShow } from "./cast-take";

// The pinned story as one scrubbed timeline. Beat k is "fully in" at second
// k * STEP, where its label sits, and its transition runs for MOVE seconds
// before that. To re-direct a beat, edit its function in `transitions` below:
// each one only touches the elements that beat changes.

/** Timeline seconds from one beat label to the next. */
const STEP = 1;
/** Timeline seconds one transition takes. The rest of STEP is a hold. */
const MOVE = 0.8;

const ENTER = "brandOut";
const EXIT = "power2.in";

/** Where the small phone of the first beat rests, as a share of the stage height. */
const HELLO_BOTTOM = 0.94;
/** How far left of its resting place a walker starts, in its own widths. */
const WALK_IN = -150;

type Timeline = gsap.core.Timeline;

interface Box {
	h: number;
	w: number;
	x: number;
	y: number;
}

/** The numbers that differ between the wide and the narrow composition. */
interface Pose {
	/** Last beat: phone size, phone lift (share of stage height), and how far the kids move apart (share of stage width). */
	goodnight: { kids: number; scale: number; y: number };
	/** Phone size on the first beat. */
	hello: number;
	/** Where the walkers stand to look at the cards, as shares of the stage. */
	shift: { x: number; y: number };
	/** Star size after it hops out, and on the last beat. */
	star: number;
	starRest: number;
}

const WIDE_POSE: Pose = {
	goodnight: { kids: 0.045, scale: 0.8, y: -0.04 },
	hello: 0.62,
	shift: { x: -0.28, y: 0 },
	star: 1.6,
	starRest: 1.2,
};

const NARROW_POSE: Pose = {
	goodnight: { kids: 0, scale: 0.68, y: -0.16 },
	hello: 0.55,
	shift: { x: 0, y: 0.31 },
	star: 1.3,
	starRest: 1,
};

interface Ctx {
	/** Elements under the stage that match a selector. */
	all: (selector: string) => Element[];
	/** Timeline second where this beat's transition starts. */
	at: number;
	/** Centre and size, in px from the stage's top left. Anchors and the star slot are never transformed. */
	box: (selector: string) => Box;
	/** Whether this beat shows a phone screen. */
	hasScreen: boolean;
	/** This beat. */
	id: BeatId;
	/** Touch device or phone: skip the extra effects. */
	light: boolean;
	pose: Pose;
	/** The beat before this one. */
	prev: BeatId;
	/** The last earlier beat that showed a phone screen. */
	prevScreen: BeatId | undefined;
	/** Stage size in px. */
	size: () => { h: number; w: number };
}

const pick = {
	anchor: (name: string) => `[data-anchor="${name}"]`,
	caption: (id: BeatId) => `[data-caption="${id}"]`,
	drift: "[data-drift]",
	hero: "[data-hero]",
	kidLeft: '[data-kid="left"]',
	kidRight: '[data-kid="right"]',
	kids: "[data-kid]",
	phone: "[data-phone]",
	scene: (id: BeatId) => `[data-scene="${id}"]`,
	screen: (id: BeatId) => `[data-screen="${id}"]`,
	slot: "[data-star-slot]",
	star: "[data-star]",
	still: "[data-still]",
	takes: "video[data-beats]",
	walkers: "[data-walker]",
	window: "[data-window]",
} as const;

/**
 * Star tween values that put the star's centre on a target element.
 * Functions, so they are measured again whenever the page is laid out again.
 */
function starOn(c: Ctx, target: string) {
	return {
		x: () => c.box(target).x - c.box(pick.slot).x,
		y: () => c.box(target).y - c.box(pick.slot).y,
	};
}

/** Walkers and the star step aside together, to look at the cards. */
function shiftAside(c: Ctx) {
	return {
		x: () => c.size().w * c.pose.shift.x,
		y: () => c.size().h * c.pose.shift.y,
	};
}

function swapCaption(tl: Timeline, c: Ctx) {
	const out = c.all(pick.caption(c.prev));
	if (out.length > 0) {
		tl.to(out, { autoAlpha: 0, duration: 0.3, ease: EXIT, y: -10 }, c.at);
	}
	tl.fromTo(
		c.all(pick.caption(c.id)),
		{ autoAlpha: 0, y: 14 },
		{ autoAlpha: 1, duration: 0.5, ease: ENTER, y: 0 },
		c.at + 0.3
	);
}

function swapScreen(tl: Timeline, c: Ctx) {
	if (c.prevScreen) {
		tl.to(
			c.all(pick.screen(c.prevScreen)),
			{ autoAlpha: 0, duration: 0.25, ease: EXIT },
			c.at
		);
	}
	if (c.hasScreen) {
		tl.to(
			c.all(pick.screen(c.id)),
			{ autoAlpha: 1, duration: 0.35, ease: ENTER },
			c.at + 0.15
		);
	}
}

/** Cross-fades the takes: those that only the new beat lists in, those that only the old one did out. */
function swapTakes(tl: Timeline, c: Ctx) {
	const takes = c.all(pick.takes);
	for (const video of takes) {
		const now = onShow(video, takes, c.id);
		const before = onShow(video, takes, c.prev);
		if (now && !before) {
			tl.fromTo(
				video,
				{ opacity: OFF },
				{ duration: 0.3, ease: ENTER, immediateRender: false, opacity: 1 },
				c.at + 0.1
			);
		} else if (before && !now) {
			tl.to(video, { duration: 0.3, ease: EXIT, opacity: OFF }, c.at + 0.1);
		}
	}
}

function showScene(tl: Timeline, c: Ctx, at: number) {
	tl.fromTo(
		c.all(pick.scene(c.id)),
		{ autoAlpha: 0 },
		{ autoAlpha: 1, duration: 0.3, ease: ENTER, immediateRender: false },
		at
	);
}

function hideScene(tl: Timeline, c: Ctx, id: BeatId) {
	tl.to(
		c.all(pick.scene(id)),
		{ autoAlpha: 0, duration: 0.3, ease: EXIT },
		c.at
	);
}

const transitions: Record<BeatId, (tl: Timeline, c: Ctx) => void> = {
	// The window grows behind the walkers; the star walks in with them.
	adventure(tl, c) {
		swapCaption(tl, c);
		swapTakes(tl, c);
		const walkStar = pick.anchor("walk-star");
		const star = starOn(c, walkStar);
		const behind = () => c.box(walkStar).w * -1.9;
		tl.to(
			c.all(pick.phone),
			{ autoAlpha: 0, duration: 0.35, ease: EXIT, scale: 0.9 },
			c.at
		)
			.to(c.all(pick.kids), { autoAlpha: 0, duration: 0.35, ease: EXIT }, c.at)
			.set(c.all(pick.scene(c.id)), { autoAlpha: 1 }, c.at)
			.fromTo(
				c.all(pick.window),
				{ autoAlpha: 0, scale: 0.88 },
				{
					autoAlpha: 1,
					duration: 0.6,
					ease: ENTER,
					immediateRender: false,
					scale: 1,
				},
				c.at + 0.2
			)
			.fromTo(
				c.all(pick.drift),
				{ xPercent: 4 },
				{
					duration: MOVE + 0.2,
					ease: "none",
					immediateRender: false,
					xPercent: -4,
				},
				c.at + 0.1
			)
			.fromTo(
				c.all(pick.walkers),
				{ xPercent: WALK_IN },
				{
					duration: 0.7,
					ease: ENTER,
					immediateRender: false,
					stagger: 0.06,
					xPercent: 0,
				},
				c.at + 0.1
			)
			.fromTo(
				c.all(pick.walkers),
				{ autoAlpha: 0 },
				{
					autoAlpha: 1,
					duration: 0.25,
					ease: "none",
					immediateRender: false,
					stagger: 0.06,
				},
				c.at + 0.1
			)
			// The star leaves the phone's side, then walks in from the left like the others.
			.to(c.all(pick.star), { autoAlpha: 0, duration: 0.25, ease: EXIT }, c.at)
			.set(
				c.all(pick.star),
				{
					scale: () => c.box(walkStar).w / c.box(pick.slot).w,
					x: () => star.x() + behind(),
					y: star.y,
				},
				c.at + 0.3
			)
			.to(
				c.all(pick.star),
				{ autoAlpha: 1, duration: 0.25, ease: "none" },
				c.at + 0.3
			)
			.to(
				c.all(pick.star),
				{ duration: 0.5, ease: ENTER, x: star.x },
				c.at + 0.3
			);
	},
	// The child asks: the hero steps up and away, the phone grows, a speech plate appears.
	ask(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		swapTakes(tl, c);
		tl.to(
			c.all(pick.hero),
			{ autoAlpha: 0, duration: 0.45, ease: EXIT, y: () => -c.size().h * 0.06 },
			c.at
		)
			.to(
				c.all(pick.phone),
				{ duration: MOVE, ease: ENTER, scale: 1, y: 0 },
				c.at
			)
			.to(c.all(pick.kids), { duration: MOVE, ease: ENTER, x: 0 }, c.at);
		showScene(tl, c, c.at + 0.25);
		if (!c.light) {
			tl.fromTo(
				c.all(`${pick.scene(c.id)} [data-pop]`),
				{ scale: 0.92, y: 12 },
				{
					duration: 0.5,
					ease: ENTER,
					immediateRender: false,
					scale: 1,
					y: 0,
				},
				c.at + 0.25
			);
		}
	},

	// Two picture cards; the window shrinks away and the walkers step aside.
	choose(tl, c) {
		swapCaption(tl, c);
		swapTakes(tl, c);
		const aside = shiftAside(c);
		const stand = starOn(c, pick.anchor("walk-star"));
		tl.to(
			c.all(pick.window),
			{ autoAlpha: 0, duration: 0.5, ease: EXIT, scale: 0.6 },
			c.at
		)
			.to(
				c.all(pick.walkers),
				{ duration: MOVE, ease: ENTER, x: aside.x, y: aside.y },
				c.at
			)
			.to(
				c.all(pick.star),
				{
					duration: MOVE,
					ease: ENTER,
					x: () => stand.x() + aside.x(),
					y: () => stand.y() + aside.y(),
				},
				c.at
			);
		showScene(tl, c, c.at + 0.2);
		const cards = c.all(`${pick.scene(c.id)} [data-card]`);
		const first = cards.slice(0, 1);
		if (!c.light) {
			tl.fromTo(
				cards,
				{ y: 24 },
				{
					duration: 0.45,
					ease: ENTER,
					immediateRender: false,
					stagger: 0.08,
					y: 0,
				},
				c.at + 0.25
			);
		}
		tl.to(
			first,
			{ duration: 0.08, ease: "power1.out", scale: 1.04 },
			c.at + 0.64
		).to(first, { duration: 0.08, ease: "power1.in", scale: 1 }, c.at + 0.72);
	},

	// Everything returns: kids, phone, the star beside it, and the page ends on the badges.
	goodnight(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		swapTakes(tl, c);
		hideScene(tl, c, "choose");
		hideScene(tl, c, "adventure");
		const apart = () => c.size().w * c.pose.goodnight.kids;
		tl.to(c.all(pick.kids), { autoAlpha: 1, duration: 0.5, ease: ENTER }, c.at)
			.to(
				c.all(pick.kidLeft),
				{ duration: 0.6, ease: ENTER, x: () => -apart() },
				c.at
			)
			.to(c.all(pick.kidRight), { duration: 0.6, ease: ENTER, x: apart }, c.at)
			.to(
				c.all(pick.phone),
				{
					autoAlpha: 1,
					duration: 0.6,
					ease: ENTER,
					scale: c.pose.goodnight.scale,
					y: () => c.size().h * c.pose.goodnight.y,
				},
				c.at
			)
			.to(
				c.all(pick.star),
				{ duration: MOVE, ease: ENTER, scale: c.pose.starRest, x: 0, y: 0 },
				c.at
			);
		showScene(tl, c, c.at + 0.3);
	},

	// First beat: no transition, only the starting pose at second 0.
	// The phone is small and low, the kids sit close to it.
	hello(tl, c) {
		const anchor = pick.anchor("phone");
		const scale = c.pose.hello;
		const inward = () => (c.box(anchor).w * (1 - scale)) / 2;
		tl.set(
			c.all(pick.phone),
			{
				scale,
				y: () =>
					c.size().h * HELLO_BOTTOM -
					(c.box(anchor).h * scale) / 2 -
					c.box(anchor).y,
			},
			0
		)
			.set(c.all(pick.kidLeft), { x: inward }, 0)
			.set(c.all(pick.kidRight), { x: () => -inward() }, 0);
	},

	// The star hops out of the phone and grows.
	star(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		swapTakes(tl, c);
		hideScene(tl, c, "ask");
		const still = starOn(c, pick.still);
		tl.to(
			c.all(pick.phone),
			{ duration: 0.5, ease: ENTER, opacity: 0.55 },
			c.at
		)
			// Start exactly over the small star on the phone screen.
			.set(
				c.all(pick.star),
				{
					scale: () => c.box(pick.still).w / c.box(pick.slot).w,
					x: still.x,
					y: still.y,
				},
				c.at
			)
			.to(
				c.all(pick.star),
				{ autoAlpha: 1, duration: 0.15, ease: "none" },
				c.at
			)
			.to(
				c.all(pick.star),
				{ duration: MOVE, ease: ENTER, scale: c.pose.star, x: 0, y: 0 },
				c.at
			);
	},
};

/** The beat whose takes should play at this timeline second: the one past the middle of its transition. */
export function beatAt(time: number) {
	const index = Math.floor((time + MOVE / 2) / STEP);
	return Math.min(Math.max(index, 0), beats.length - 1);
}

/** Fills `tl` with every beat. Call inside gsap.matchMedia so it reverts on change. */
export function buildStory(
	tl: Timeline,
	stage: HTMLElement,
	wide: boolean,
	light: boolean
) {
	const all = (selector: string) =>
		gsap.utils.toArray<Element>(selector, stage);
	const origin = () => stage.getBoundingClientRect();
	const box = (selector: string): Box => {
		const rect = stage.querySelector(selector)?.getBoundingClientRect();
		const root = origin();
		return {
			h: rect?.height ?? 1,
			w: rect?.width ?? 1,
			x: rect ? rect.left - root.left + rect.width / 2 : 0,
			y: rect ? rect.top - root.top + rect.height / 2 : 0,
		};
	};
	const size = () => ({ h: stage.clientHeight, w: stage.clientWidth });
	const pose = wide ? WIDE_POSE : NARROW_POSE;
	const list: readonly Beat[] = beats;
	let prevScreen: BeatId | undefined;
	for (const [index, beat] of list.entries()) {
		const prev = list[Math.max(index - 1, 0)].id;
		const at = Math.max(index * STEP - MOVE, 0);
		transitions[beat.id](tl, {
			all,
			at,
			box,
			hasScreen: Boolean(beat.screen),
			id: beat.id,
			light,
			pose,
			prev,
			prevScreen,
			size,
		});
		tl.addLabel(beat.id, index * STEP);
		if (beat.screen) {
			prevScreen = beat.id;
		}
	}
}
