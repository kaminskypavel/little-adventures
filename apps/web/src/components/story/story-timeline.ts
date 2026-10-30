import { gsap } from "@/lib/gsap";
import { type BeatId, beats } from "./beats";

// The pinned story as one scrubbed timeline. Beat k is "fully in" at second
// k * STEP, where its label sits, and its transition runs for MOVE seconds
// before that. To re-direct a beat, edit its function in `transitions` below:
// each one only touches the elements that beat changes.

/** Timeline seconds from one beat label to the next. */
const STEP = 1;
/** Timeline seconds one transition takes. The rest of STEP is a hold. */
const MOVE = 0.8;
/** Share of the star video frame that the star itself fills. */
const STAR_FILL = 0.55;

const ENTER = "brandOut";
const EXIT = "power2.in";

type Timeline = gsap.core.Timeline;

interface Box {
	h: number;
	w: number;
	x: number;
	y: number;
}

interface Ctx {
	/** Elements under the stage that match a selector. */
	all: (selector: string) => Element[];
	/** Timeline second where this beat's transition starts. */
	at: number;
	/** Centre and size on screen. Anchors and the star slot are never transformed. */
	box: (selector: string) => Box;
	/** This beat. */
	id: BeatId;
	/** The beat before this one. */
	prev: BeatId;
	/** Desktop and tablet (true) or phone (false). Phone gets the light version. */
	wide: boolean;
}

const pick = {
	anchor: (name: string) => `[data-anchor="${name}"]`,
	caption: (id: BeatId) => `[data-caption="${id}"]`,
	kidLeft: '[data-kid="left"]',
	kidRight: '[data-kid="right"]',
	kids: "[data-kid]",
	phone: "[data-phone]",
	scene: (id: BeatId) => `[data-scene="${id}"]`,
	screen: (id: BeatId) => `[data-screen="${id}"]`,
	slot: "[data-star-slot]",
	star: "[data-star]",
	still: "[data-still]",
} as const;

/**
 * Star tween values that put the star's centre on a target element.
 * Functions, so they are measured again whenever the page is laid out again.
 */
function starOn(c: Ctx, target: string, lift = 0) {
	return {
		x: () => c.box(target).x - c.box(pick.slot).x,
		y: () => c.box(target).y - c.box(pick.slot).y - c.box(target).h * lift,
	};
}

function swapCaption(tl: Timeline, c: Ctx) {
	tl.to(
		c.all(pick.caption(c.prev)),
		{ autoAlpha: 0, duration: 0.3, ease: EXIT, y: -10 },
		c.at
	).fromTo(
		c.all(pick.caption(c.id)),
		{ autoAlpha: 0, y: 14 },
		{ autoAlpha: 1, duration: 0.5, ease: ENTER, y: 0 },
		c.at + 0.3
	);
}

function swapScreen(tl: Timeline, c: Ctx) {
	tl.to(
		c.all(pick.screen(c.prev)),
		{ autoAlpha: 0, duration: 0.25, ease: EXIT },
		c.at
	).to(
		c.all(pick.screen(c.id)),
		{ autoAlpha: 1, duration: 0.35, ease: ENTER },
		c.at + 0.15
	);
}

function showScene(tl: Timeline, c: Ctx, at: number) {
	tl.fromTo(
		c.all(pick.scene(c.id)),
		{ autoAlpha: 0 },
		{ autoAlpha: 1, duration: 0.3, ease: ENTER },
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
	// The speech plate near the left kid; the phone listens.
	ask(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		showScene(tl, c, c.at + 0.25);
		if (c.wide) {
			tl.fromTo(
				c.all(`${pick.scene(c.id)} [data-pop]`),
				{ scale: 0.92, y: 12 },
				{ duration: 0.5, ease: ENTER, scale: 1, y: 0 },
				c.at + 0.25
			);
		}
	},

	// Two picture cards; the first one pulses once.
	choose(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		hideScene(tl, c, "map");
		showScene(tl, c, c.at + 0.2);
		const cards = c.all(`${pick.scene(c.id)} [data-card]`);
		const first = cards.slice(0, 1);
		tl.fromTo(
			cards,
			{ y: 24 },
			{ duration: 0.45, ease: ENTER, stagger: 0.08, y: 0 },
			c.at + 0.25
		)
			.to(
				c.all(pick.star),
				{
					duration: MOVE,
					ease: ENTER,
					scale: 0.7,
					...starOn(c, pick.anchor("choose")),
				},
				c.at
			)
			.to(
				first,
				{ duration: 0.08, ease: "power1.out", scale: 1.04 },
				c.at + 0.64
			)
			.to(first, { duration: 0.08, ease: "power1.in", scale: 1 }, c.at + 0.72);
	},
	// First beat: no transition, only the starting pose at second 0.
	evening(tl, c) {
		const lean = c.wide ? 16 : 8;
		tl.set(c.all(pick.kids), { transformOrigin: "50% 100%" }, 0)
			.set(c.all(pick.kidLeft), { rotation: 4, x: lean }, 0)
			.set(c.all(pick.kidRight), { rotation: -4, x: -lean }, 0)
			// The star starts hidden, exactly over the small star on the welcome screen.
			.set(
				c.all(pick.star),
				{
					autoAlpha: 0,
					scale: () => c.box(pick.still).w / c.box(pick.slot).w,
					...starOn(c, pick.still),
				},
				0
			);
	},

	// Everything returns to its rest pose; the star settles beside the phone.
	goodnight(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		hideScene(tl, c, "choose");
		tl.to(
			c.all(pick.phone),
			{ duration: 0.6, ease: ENTER, opacity: 1, scale: 1 },
			c.at
		)
			.to(
				c.all(pick.kids),
				{ duration: 0.6, ease: ENTER, opacity: 1, scale: 1 },
				c.at
			)
			.to(
				c.all(pick.star),
				{ duration: MOVE, ease: ENTER, scale: 1, x: 0, y: 0 },
				c.at
			);
	},

	// Phone and kids step back, a map grows, the star lands on the first place.
	map(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		tl.to(
			c.all(pick.phone),
			{ duration: 0.6, ease: ENTER, opacity: 0.35, scale: 0.72 },
			c.at
		)
			.to(
				c.all(pick.kids),
				{ duration: 0.6, ease: ENTER, opacity: 0.35, scale: 0.8 },
				c.at
			)
			.to(
				c.all(pick.star),
				{
					duration: MOVE,
					ease: ENTER,
					scale: () =>
						c.box(pick.anchor("place")).w / (c.box(pick.slot).w * STAR_FILL),
					...starOn(c, pick.anchor("place"), 0.4),
				},
				c.at
			);
		showScene(tl, c, c.at + 0.2);
		if (c.wide) {
			// Places pop in one after another. The phone just fades the whole map.
			tl.fromTo(
				c.all(`${pick.scene(c.id)} [data-item]`),
				{ autoAlpha: 0, scale: 0.7, y: 14 },
				{
					autoAlpha: 1,
					duration: 0.36,
					ease: ENTER,
					scale: 1,
					stagger: 0.03,
					y: 0,
				},
				c.at + 0.2
			);
		}
	},

	// The star leaves the phone, up and toward the open side, and grows.
	star(tl, c) {
		swapCaption(tl, c);
		swapScreen(tl, c);
		hideScene(tl, c, "ask");
		tl.to(
			c.all(pick.phone),
			{ duration: 0.5, ease: ENTER, opacity: 0.55 },
			c.at
		)
			.to(
				c.all(pick.star),
				{ autoAlpha: 1, duration: 0.15, ease: "none" },
				c.at
			)
			.to(
				c.all(pick.star),
				{
					duration: MOVE,
					ease: ENTER,
					scale: c.wide ? 1.6 : 1.3,
					x: 0,
					y: 0,
				},
				c.at
			);
	},
};

/** Fills `tl` with every beat. Call inside gsap.matchMedia so it reverts on change. */
export function buildStory(tl: Timeline, stage: HTMLElement, wide: boolean) {
	const all = (selector: string) =>
		gsap.utils.toArray<Element>(selector, stage);
	const box = (selector: string): Box => {
		const rect = stage.querySelector(selector)?.getBoundingClientRect();
		return {
			h: rect?.height ?? 1,
			w: rect?.width ?? 1,
			x: rect ? rect.left + rect.width / 2 : 0,
			y: rect ? rect.top + rect.height / 2 : 0,
		};
	};
	for (const [index, beat] of beats.entries()) {
		const prev = beats[Math.max(index - 1, 0)].id;
		const at = Math.max(index * STEP - MOVE, 0);
		transitions[beat.id](tl, { all, at, box, id: beat.id, prev, wide });
		tl.addLabel(beat.id, index * STEP);
	}
}
