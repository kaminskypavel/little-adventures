"use client";

import Image from "next/image";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { StoreBadges } from "@/components/waitlist/store-badges";
import { Wordmark } from "@/components/wordmark";
import { gsap, Observer, useGSAP } from "@/lib/gsap";
import {
	CastTake,
	OFF,
	onShow,
	posterOf,
	stopTakes,
	syncTakes,
} from "./cast-take";
import { ScrollHint } from "./scroll-hint";
import {
	type ActorId,
	type Layout,
	type Pose,
	type StageActor,
	slidePoses,
	takeFor,
	takesOf,
	type VideoActor,
} from "./slide-poses";
import {
	FOOTER_LINE,
	PLACES,
	QUESTION,
	type Slide,
	type SlideId,
	slides,
} from "./slides";

// Lets a style object carry the custom properties the actors move by.
declare module "react" {
	interface CSSProperties {
		[key: `--${string}`]: number | string | undefined;
	}
}

// ---- Motion: one gesture is one slide. Edit the numbers here. ----

/** Seconds every actor takes to reach the next pose. */
const MOVE = 0.65;
/** Input is ignored this long after a move starts. */
const LOCK_MS = 600;
/** A wheel pause longer than this ends a gesture. Shorter pauses are momentum. */
const GESTURE_GAP_MS = 140;
const TEXT_OUT = { duration: 0.18, ease: "power2.in", y: -18 } as const;
const TEXT_IN_AT = 0.22;
const TAKE_FADE_AT = 0.1;
/** Where an instant jump lands on the move's clock: after every tween of it. */
const SETTLED_AT = 2;

const WIDE_QUERY =
	"(min-width: 900px) and (prefers-reduced-motion: no-preference)";
const NARROW_QUERY =
	"(max-width: 899.98px) and (prefers-reduced-motion: no-preference)";

const LAST = slides.length - 1;

// ---- Where things rest. Poses in slide-poses.ts move them from here. ----

// The stage is one box for every slide. cqw and cqh are its own width and
// height, so a pose in percent of the stage needs no pixels and survives a
// resize.
const STAGE =
	"overflow-hidden [container-type:size] [--kid:74vw] [--star:44vw] min-[900px]:[--kid:min(74vh,35vw)] min-[900px]:[--star:34vh]";
const STAGE_LIVE = `${STAGE} absolute inset-x-0 bottom-0 z-10 h-[56svh] min-[900px]:inset-x-auto min-[900px]:inset-y-0 min-[900px]:right-0 min-[900px]:h-svh min-[900px]:w-[56vw] motion-reduce:hidden`;
const STAGE_STILL = `${STAGE} relative h-[56svh] w-full min-[900px]:h-svh min-[900px]:w-[56vw]`;

// An actor sits at its CSS spot; --x --y --s --r (set by its pose) move it.
const ACTOR =
	"pointer-events-none absolute will-change-[translate,scale,opacity] [translate:calc(var(--x)*1cqw)_calc(var(--y)*1cqh)] [scale:var(--s)] [rotate:calc(var(--r)*1deg)]";
const KID = "size-[var(--kid)] bottom-0 min-[900px]:bottom-[4%]";

const ACTOR_AT: Record<StageActor, string> = {
	boy: `${KID} left-[-15vw] min-[900px]:left-[-2%]`,
	bubble:
		"left-[3vw] bottom-[calc(var(--kid)*0.86+10px)] w-max origin-bottom-left min-[900px]:left-[calc(1%+var(--kid)*0.43)] min-[900px]:bottom-[calc(4%+var(--kid)*0.9+28px)]",
	girl: `${KID} right-[-15vw] min-[900px]:right-[-2%]`,
	moonCrescent:
		"aspect-[700/602] h-[8vh] right-[6%] top-[3%] min-[900px]:h-[13vh] min-[900px]:right-[8%] min-[900px]:top-[7%]",
	moonHammock:
		"aspect-[900/897] w-[96vw] left-[2vw] bottom-[-2%] min-[900px]:w-[78%] min-[900px]:left-[11%]",
	planetA:
		"w-[26vw] left-[6vw] top-[3%] min-[900px]:w-[24vh] min-[900px]:left-[calc(30%-12vh)] min-[900px]:top-[12%]",
	planetB:
		"w-[26vw] right-[6vw] top-[7%] min-[900px]:w-[24vh] min-[900px]:right-[calc(30%-12vh)] min-[900px]:top-[17%]",
	star: "size-[var(--star)] left-[calc(50%-var(--star)/2)] top-[calc(40%-var(--star)/2)] min-[900px]:top-[calc(52%-var(--star)/2)]",
};

// The pictures are illustrations, not buttons, so they stay flat: no clay
// lift, no press, no pointer cursor.
const RIM =
	"rounded-full bg-[linear-gradient(180deg,#F8ECC4,#E8D5A0)] p-1.5 shadow-[0_6px_8px_-3px_rgba(0,0,0,0.5)]";
const PLATE =
	"rounded-plate bg-sand text-ink-navy w-fit px-4 py-1 text-center text-[18px] leading-tight font-black";

// Pose to the numbers the actor's CSS reads. Hidden means hidden for real,
// so a pose with no alpha shows the actor.
function poseStyle(pose: Pose): CSSProperties {
	const alpha = pose.alpha ?? 1;
	return {
		"--r": pose.r ?? 0,
		"--s": pose.s ?? 1,
		"--x": pose.x ?? 0,
		"--y": pose.y ?? 0,
		opacity: alpha,
		visibility: alpha === 0 ? "hidden" : "visible",
	};
}

function Actor({
	children,
	id,
	pose,
}: {
	children: ReactNode;
	id: StageActor;
	pose: Pose;
}) {
	return (
		<div
			aria-hidden="true"
			className={`${ACTOR} ${ACTOR_AT[id]}`}
			data-actor={id}
			style={poseStyle(pose)}
		>
			{children}
		</div>
	);
}

// Live: every take of the actor, stacked. Still: the one poster this slide shows.
function Cast({
	actor,
	live,
	slide,
}: {
	actor: VideoActor;
	live: boolean;
	slide: SlideId;
}) {
	if (!live) {
		return (
			<Image
				alt=""
				className="absolute inset-0 size-full"
				height={768}
				sizes="(min-width: 900px) 31vw, 54vw"
				src={posterOf(takeFor[slide][actor][0])}
				width={768}
			/>
		);
	}
	return takesOf(actor).map((take) => (
		<CastTake
			key={take.name}
			name={take.name}
			slides={take.slides}
			then={take.handTo}
		/>
	));
}

function Planet({
	id,
	live,
	place,
	pose,
}: {
	id: "planetA" | "planetB";
	live: boolean;
	place: (typeof PLACES)[number];
	pose: Pose;
}) {
	return (
		<Actor id={id} pose={pose}>
			<div
				className="flex flex-col items-center"
				data-float={live ? "" : undefined}
			>
				<div className={`${RIM} w-full`}>
					<div className="relative aspect-square overflow-hidden rounded-full">
						<Image
							alt=""
							className="object-cover"
							fill
							sizes="(min-width: 900px) 24vh, 26vw"
							src={place.src}
						/>
					</div>
				</div>
				<p className={`${PLATE} mt-2.5 whitespace-nowrap`}>{place.name}</p>
			</div>
		</Actor>
	);
}

// The whole stage for one slide. Live: every actor and every take, moved by
// the story. Still: only what this slide shows, as posters, for reduced motion.
function Stage({
	layout,
	live,
	slide,
}: {
	layout: Layout;
	live: boolean;
	slide: SlideId;
}) {
	const poses = slidePoses[layout][slide];
	const shows = (id: StageActor) => live || (poses[id].alpha ?? 1) > 0;
	const mark = live ? "" : undefined;

	return (
		<div
			aria-hidden="true"
			className={live ? STAGE_LIVE : STAGE_STILL}
			data-live-stage={mark}
		>
			{shows("moonCrescent") ? (
				<Actor id="moonCrescent" pose={poses.moonCrescent}>
					<Image
						alt=""
						className="size-full"
						height={602}
						sizes="(min-width: 900px) 30vh, 20vh"
						src="/moon/moon-crescent.webp"
						width={700}
					/>
				</Actor>
			) : null}
			{shows("moonHammock") ? (
				<Actor id="moonHammock" pose={poses.moonHammock}>
					<Image
						alt=""
						className="size-full [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent),linear-gradient(to_bottom,transparent,#000_5%)] [mask-composite:intersect]"
						height={897}
						sizes="(min-width: 900px) 44vw, 96vw"
						src="/moon/moon-hammock.webp"
						width={900}
					/>
				</Actor>
			) : null}
			{shows("planetA") ? (
				<Planet
					id="planetA"
					live={live}
					place={PLACES[0]}
					pose={poses.planetA}
				/>
			) : null}
			{shows("planetB") ? (
				<Planet
					id="planetB"
					live={live}
					place={PLACES[1]}
					pose={poses.planetB}
				/>
			) : null}
			<Actor id="girl" pose={poses.girl}>
				<div className="absolute inset-0" data-float={mark}>
					<Cast actor="girl" live={live} slide={slide} />
				</div>
			</Actor>
			<Actor id="boy" pose={poses.boy}>
				<div className="absolute inset-0" data-float={mark}>
					<Cast actor="boy" live={live} slide={slide} />
				</div>
			</Actor>
			<Actor id="star" pose={poses.star}>
				<Cast actor="star" live={live} slide={slide} />
			</Actor>
			{shows("bubble") ? (
				<Actor id="bubble" pose={poses.bubble}>
					<p className="bg-sand text-ink-navy max-w-[9em] rounded-[25px] px-5 py-3 text-[clamp(18px,1.7vw,26px)] leading-tight font-black text-balance min-[900px]:max-w-[10em]">
						{QUESTION}
					</p>
					<span className="bg-sand absolute -bottom-3 left-6 h-3.5 w-[22px] [clip-path:polygon(0_0,100%_0,0_100%)]" />
				</Actor>
			) : null}
		</div>
	);
}

// ---- Text: one block per slide, stacked in slide mode ----

// Slide mode stacks the blocks and shows one. Reduced motion lays them out in
// normal flow, one section each.
const TEXT =
	"pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-[22px] pt-[calc(env(safe-area-inset-top)+28px)] text-center min-[900px]:inset-y-0 min-[900px]:right-auto min-[900px]:w-[44vw] min-[900px]:items-start min-[900px]:justify-center min-[900px]:gap-5 min-[900px]:pt-0 min-[900px]:pr-6 min-[900px]:pl-[clamp(32px,6vw,104px)] min-[900px]:text-left motion-reduce:pointer-events-auto motion-reduce:relative motion-reduce:inset-auto motion-reduce:pb-8 min-[900px]:motion-reduce:pb-0";
// Items start hidden, except the first slide's, so the page paints as the hero.
const ITEM_LATER = "motion-safe:invisible motion-safe:opacity-0";
const ITEM = "pointer-events-auto";
const TITLE =
	"max-w-[16ch] text-[clamp(30px,8vw,38px)] leading-[1.06] font-black text-balance text-cream min-[900px]:text-[clamp(38px,3.8vw,64px)]";
const SUB =
	"max-w-[24ch] text-[clamp(18px,4.8vw,22px)] leading-snug font-extrabold text-balance text-cream/85 min-[900px]:text-[clamp(20px,1.8vw,30px)]";

function SlideText({ slide }: { slide: Slide }) {
	const first = slide.id === "hello";
	const item = first ? ITEM : `${ITEM} ${ITEM_LATER}`;

	return (
		<div className={TEXT} data-slide-text={slide.id}>
			{first ? (
				<div className={item} data-slide-item>
					<Wordmark className="leading-none text-[length:clamp(44px,12.5vw,60px)] min-[900px]:text-[length:clamp(56px,7vw,116px)]" />
				</div>
			) : (
				<h2 className={`${item} ${TITLE}`} data-slide-item>
					{slide.title}
				</h2>
			)}
			<p
				className={`${item} ${first ? "max-w-[22ch] text-[clamp(22px,2vw,30px)] leading-tight font-extrabold text-balance" : SUB}`}
				data-slide-item
			>
				{slide.sub}
			</p>
			{first || slide.id === "goodnight" ? (
				<div className={`${item} mt-2`} data-slide-item>
					<StoreBadges align="start" />
				</div>
			) : null}
			{slide.id === "goodnight" ? (
				<p
					className={`${item} text-cream/60 text-[14px] font-bold`}
					data-slide-item
				>
					{FOOTER_LINE}
				</p>
			) : null}
		</div>
	);
}

// ---- One move: every actor goes to the pose of the slide it is going to ----

function actorVars(id: ActorId, pose: Pose) {
	const autoAlpha = pose.alpha ?? 1;
	if (id === "clouds") {
		return { autoAlpha, y: ((pose.y ?? 0) / 100) * window.innerHeight };
	}
	if (id === "dim") {
		return { autoAlpha };
	}
	return {
		"--r": pose.r ?? 0,
		"--s": pose.s ?? 1,
		"--x": pose.x ?? 0,
		"--y": pose.y ?? 0,
		autoAlpha,
	};
}

/** A gentle up and down around where the element rests. Runs until killed. */
function bob(targets: Element[], amp: number, period: number, delay = 0) {
	return gsap
		.timeline({ delay })
		.to(targets, { duration: period / 4, ease: "sine.out", y: -amp })
		.to(targets, {
			duration: period / 2,
			ease: "sine.inOut",
			repeat: -1,
			y: amp,
			yoyo: true,
		});
}

const ACTOR_IDS: readonly ActorId[] = [
	"boy",
	"bubble",
	"clouds",
	"dim",
	"girl",
	"moonCrescent",
	"moonHammock",
	"planetA",
	"planetB",
	"star",
];

interface Move {
	/** Loops that start when the move lands. The caller stops them with the next move. */
	ambient: gsap.core.Timeline[];
	/** Where the move starts. Not set for the first placement of a slide. */
	from?: number;
	layout: Layout;
	root: HTMLElement;
	stage: HTMLElement;
	to: number;
}

function buildMove({ ambient, from, layout, root, stage, to }: Move) {
	const { id } = slides[to];
	const poses = slidePoses[layout][id];
	const pick = (selector: string) => [
		...root.querySelectorAll<HTMLElement>(selector),
	];
	const items = (slide: SlideId) =>
		pick(`[data-slide-text="${slide}"] [data-slide-item]`);
	// The live stage only: the stills of reduced motion carry the same names.
	const inStage = (selector: string) => [
		...stage.querySelectorAll<HTMLElement>(selector),
	];
	const actor = (name: ActorId) => {
		if (name === "clouds") {
			return [...document.querySelectorAll<HTMLElement>("[data-sky-clouds]")];
		}
		return name === "dim"
			? pick('[data-actor="dim"]')
			: inStage(`[data-actor="${name}"]`);
	};
	const tl = gsap.timeline();

	// Text: the old block out, the new one in. Every other block stays hidden.
	const outgoing = from === undefined ? undefined : slides[from].id;
	for (const slide of slides) {
		if (slide.id !== id && slide.id !== outgoing) {
			gsap.set(items(slide.id), { autoAlpha: 0 });
		}
	}
	if (outgoing) {
		tl.to(items(outgoing), { autoAlpha: 0, ...TEXT_OUT }, 0);
	}
	tl.fromTo(
		items(id),
		{ autoAlpha: 0, y: 22 },
		{
			autoAlpha: 1,
			duration: 0.4,
			ease: "brandOut",
			immediateRender: false,
			stagger: 0.06,
			y: 0,
		},
		TEXT_IN_AT
	);
	tl.to(
		pick("[data-scroll-hint]"),
		{ autoAlpha: to === 0 ? 1 : 0, duration: 0.2 },
		0
	);

	// Actors: all of them, to the absolute pose of this slide.
	for (const name of ACTOR_IDS) {
		const pose = poses[name];
		tl.to(
			actor(name),
			{
				duration: MOVE,
				ease: "brandOut",
				...pose.tween,
				...actorVars(name, pose),
			},
			0
		);
	}
	const near = (name: StageActor) =>
		inStage(`[data-actor="${name}"] [data-float]`);
	// Whatever bobbed on the last slide settles back to its rest.
	tl.to(
		inStage("[data-float]"),
		{
			duration: MOVE,
			ease: "brandOut",
			scale: 1,
			y: 0,
		},
		0
	);

	// Takes: the ones this slide shows fade in, the rest fade out.
	const videos = [
		...stage.querySelectorAll<HTMLVideoElement>("video[data-slides]"),
	];
	for (const video of videos) {
		const want = onShow(video, videos, id) ? 1 : OFF;
		if (Math.abs(Number(gsap.getProperty(video, "opacity")) - want) > 0.005) {
			tl.to(
				video,
				{
					duration: 0.22,
					ease: want === 1 ? "brandOut" : "power2.in",
					opacity: want,
				},
				TAKE_FADE_AT
			);
		}
	}

	// What this slide does once it has landed.
	if (id === "liftoff") {
		tl.add(() => {
			ambient.push(
				bob([...near("boy"), ...near("girl")], window.innerHeight * 0.012, 2.6)
			);
		}, MOVE);
	}
	if (id === "choose") {
		tl.add(() => {
			ambient.push(
				bob(near("planetA"), window.innerHeight * 0.01, 3.4),
				bob(near("planetB"), window.innerHeight * 0.01, 4.1, 0.5)
			);
		}, MOVE);
		tl.fromTo(
			near("planetA"),
			{ scale: 1 },
			{
				duration: 0.18,
				ease: "sine.inOut",
				immediateRender: false,
				repeat: 1,
				scale: 1.06,
				yoyo: true,
			},
			MOVE
		);
		tl.fromTo(
			near("planetB"),
			{ scale: 1 },
			{
				duration: 0.18,
				ease: "sine.inOut",
				immediateRender: false,
				repeat: 1,
				scale: 1.06,
				yoyo: true,
			},
			MOVE + 0.5
		);
	}
	return tl;
}

// ---- The story ----

export function StorySlides() {
	const rootRef = useRef<HTMLDivElement>(null);
	// The slide on show. A ref, so a layout change keeps its place.
	const current = useRef(0);

	useGSAP(
		() => {
			const root = rootRef.current;
			const stage = root?.querySelector<HTMLElement>("[data-live-stage]");
			if (!(root && stage)) {
				return;
			}
			const mm = gsap.matchMedia();
			mm.add({ narrow: NARROW_QUERY, wide: WIDE_QUERY }, (context) => {
				const layout: Layout = context.conditions?.wide ? "wide" : "narrow";
				let move: gsap.core.Timeline | undefined;
				let ambient: gsap.core.Timeline[] = [];
				let lockedUntil = 0;
				// One gesture moves one slide: the first move of a gesture wins, the
				// rest of it (momentum, a long drag) is swallowed.
				let used = false;
				let lastWheel = 0;

				const go = (to: number, from?: number) => {
					move?.kill();
					for (const loop of ambient) {
						loop.kill();
					}
					ambient = [];
					current.current = to;
					// The takes of the new slide start now, not when the move ends.
					syncTakes(stage, slides[to].id, slides[to + 1]?.id);
					move = buildMove({ ambient, from, layout, root, stage, to });
					if (from === undefined) {
						move.totalTime(SETTLED_AT);
					} else {
						lockedUntil = performance.now() + LOCK_MS;
					}
				};

				const busy = () =>
					performance.now() < lockedUntil ||
					document.querySelector("dialog[open]") !== null;

				const goTo = (to: number) => {
					const clamped = Math.min(LAST, Math.max(0, to));
					if (clamped !== current.current && !busy()) {
						go(clamped, current.current);
					}
				};

				const gesture = (dir: 1 | -1, self: Observer) => {
					if (
						!self.isPressed &&
						performance.now() - lastWheel > GESTURE_GAP_MS
					) {
						used = false;
					}
					if (used) {
						return;
					}
					used = true;
					goTo(current.current + dir);
				};

				// wheelSpeed -1: a wheel turned down counts as a swipe up, which is "next".
				const observer = Observer.create({
					ignore: "dialog",
					onDown: (self) => gesture(-1, self),
					onPress: () => {
						used = false;
					},
					onUp: (self) => gesture(1, self),
					onWheel: () => {
						lastWheel = performance.now();
					},
					preventDefault: true,
					target: window,
					tolerance: 10,
					type: "wheel,touch",
					wheelSpeed: -1,
				});

				const onKey = (event: KeyboardEvent) => {
					const target = event.target instanceof Element ? event.target : null;
					if (
						event.defaultPrevented ||
						event.altKey ||
						event.ctrlKey ||
						event.metaKey ||
						target?.closest("input, textarea, select, [contenteditable]")
					) {
						return;
					}
					// Space and Enter belong to a focused button or link.
					if (
						(event.key === " " || event.key === "Enter") &&
						target?.closest("button, a, summary")
					) {
						return;
					}
					const at = current.current;
					const targets: Record<string, number> = {
						" ": at + 1,
						ArrowDown: at + 1,
						ArrowLeft: at - 1,
						ArrowRight: at + 1,
						ArrowUp: at - 1,
						End: LAST,
						Home: 0,
						PageDown: at + 1,
						PageUp: at - 1,
					};
					const to = targets[event.key];
					if (to === undefined) {
						return;
					}
					event.preventDefault();
					goTo(to);
				};
				const hint = root.querySelector("[data-scroll-hint]");
				const onHint = () => goTo(current.current + 1);
				window.addEventListener("keydown", onKey);
				hint?.addEventListener("click", onHint);

				// The hero is alive before any input: place the current slide after first paint.
				const frame = requestAnimationFrame(() => go(current.current));

				return () => {
					cancelAnimationFrame(frame);
					window.removeEventListener("keydown", onKey);
					hint?.removeEventListener("click", onHint);
					observer.kill();
					move?.kill();
					for (const loop of ambient) {
						loop.kill();
					}
					stopTakes(stage);
				};
			});
			return () => mm.revert();
		},
		{ scope: rootRef }
	);

	return (
		<div
			className="relative isolate h-svh overflow-hidden motion-reduce:h-auto motion-reduce:overflow-visible"
			ref={rootRef}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-0 z-0 bg-[rgba(5,11,24,0.35)] opacity-0 motion-reduce:hidden"
				data-actor="dim"
				style={{ visibility: "hidden" }}
			/>
			<Stage layout="wide" live slide="hello" />
			<ol>
				{slides.map((slide) => (
					<li
						className="pointer-events-none absolute inset-0 z-20 motion-reduce:pointer-events-auto motion-reduce:relative motion-reduce:inset-auto motion-reduce:flex motion-reduce:min-h-svh motion-reduce:flex-col min-[900px]:motion-reduce:flex-row"
						key={slide.id}
					>
						<SlideText slide={slide} />
						<div className="hidden motion-reduce:max-[899.98px]:block">
							<Stage layout="narrow" live={false} slide={slide.id} />
						</div>
						<div className="hidden motion-reduce:min-[900px]:block">
							<Stage layout="wide" live={false} slide={slide.id} />
						</div>
					</li>
				))}
			</ol>
			<ScrollHint />
		</div>
	);
}
