"use client";

import Image from "next/image";
import { type JSX, type ReactNode, useRef } from "react";
import { StoreBadges } from "@/components/waitlist/store-badges";
import { Wordmark } from "@/components/wordmark";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { type BeatId, beats } from "./beats";
import { CastTake, stopTakes, syncTakes } from "./cast-take";
import { Phone } from "./phone";
import { beatAt, buildStory } from "./story-timeline";

const CHOICES = [
	{ name: "Whale songs", src: "/places/whale-songs.jpg" },
	{ name: "Earth rise", src: "/places/earth-rise.jpg" },
] as const;

const FOOTER_LINE = "© 2026 Little Adventures · littleadventures.app";

// The pictures are illustrations, not buttons, so they stay flat: no clay
// lift, no press, no pointer cursor.
const MEDALLION = "shadow-[0_6px_8px_-3px_rgba(0,0,0,0.5)]";
const PLATE =
	"rounded-plate bg-sand px-2.5 py-0.5 text-center font-black text-ink-navy leading-tight";

// Shared geometry. Phone first, then md and up. Every box is sized from these.
const STAGE_VARS = [
	"[--phone-h:50svh] md:[--phone-h:62svh]",
	"[--phone-w:calc(var(--phone-h)*390/844)]",
	// A kid's video is a square with the kid in the middle 55%.
	"[--kid:min(40svh,46vw)] md:[--kid:min(46svh,30vw)]",
	"[--kid-x:calc(50%_-_var(--phone-w)/2_-_2svh_-_var(--kid)*0.7)] md:[--kid-x:calc(50%_-_var(--phone-w)/2_-_3svh_-_var(--kid)*0.7)]",
	"[--kid-y:calc(var(--kid)*-0.08)]",
	"[--star-w:16svh] md:[--star-w:20svh]",
	"[--star-x:calc(50%_+_var(--phone-w)/2_-_6svh)] md:[--star-x:calc(50%_+_var(--phone-w)/2_+_1svh)]",
	"[--star-y:20svh] md:[--star-y:24svh]",
	"[--win-w:min(92vw,106svh)]",
	"[--walk:calc(var(--win-w)*0.56)] md:[--walk:calc(var(--win-w)*0.35)]",
].join(" ");

// Elements that appear after the first beat start hidden. Reduced motion shows them all.
const HIDDEN = "motion-safe:invisible motion-safe:opacity-0";

const SCENE = `absolute inset-0 z-20 flex items-center justify-center pt-[8svh] ${HIDDEN} motion-reduce:static motion-reduce:w-full motion-reduce:pt-10 motion-reduce:pb-10`;

function Hero() {
	return (
		<div
			className="absolute inset-x-0 top-[4svh] z-40 flex flex-col items-center gap-3 px-[22px] text-center motion-reduce:static motion-reduce:pt-10"
			data-hero
		>
			<Wordmark />
			<p className="max-w-[22ch] text-[clamp(22px,2.6vw,32px)] leading-tight font-extrabold">
				{beats[0].caption}
			</p>
			<StoreBadges className="mt-2" />
		</div>
	);
}

function Kid({
	children,
	className,
	side,
}: {
	children: ReactNode;
	className: string;
	side: "left" | "right";
}) {
	return (
		<div
			aria-hidden="true"
			className={`absolute z-10 size-[var(--kid)] ${className}`}
			data-kid={side}
		>
			{children}
		</div>
	);
}

function Walker({
	className,
	kid,
}: {
	className: string;
	kid: "boy" | "girl";
}) {
	return (
		<div
			aria-hidden="true"
			className={`absolute bottom-[calc(var(--walk)*-0.1)] aspect-square ${className} ${HIDDEN}`}
			data-walker={kid}
		>
			<CastTake beats={["adventure", "choose"]} name={`${kid}-walk`} still />
		</div>
	);
}

function AskScene() {
	return (
		<div className={SCENE} data-scene="ask">
			<p
				className={`${PLATE} absolute bottom-[calc(var(--kid-y)_+_var(--kid)*0.86_+_1svh)] left-[max(0.75rem,calc(var(--kid-x)_+_var(--kid)*0.1))] px-4 py-2 text-[clamp(16px,1.7vw,22px)] motion-reduce:static`}
				data-pop
			>
				Why do whales sing?
			</p>
		</div>
	);
}

function AdventureScene() {
	return (
		<div
			className={`${SCENE} [--boy-x:-3%] [--girl-x:-30%] [--star-wx:26%] md:[--boy-x:-4%] md:[--girl-x:-24%] md:[--star-wx:17%]`}
			data-scene="adventure"
		>
			<div
				className="relative aspect-video w-[var(--win-w)]"
				data-anchor="window"
			>
				<div
					className={`rounded-card absolute inset-0 overflow-hidden ${MEDALLION} ${HIDDEN}`}
					data-window
				>
					{/* Wider than the window, so it can drift sideways without a gap. */}
					<div className="absolute -inset-x-[6%] inset-y-0" data-drift>
						<Image
							alt=""
							className="object-cover"
							fill
							sizes="(min-width: 768px) 1000px, 100vw"
							src="/places/whale-songs.jpg"
						/>
					</div>
				</div>
				<Walker
					className="left-[calc(50%_+_var(--boy-x)_-_var(--walk)*0.5)] w-[var(--walk)]"
					kid="boy"
				/>
				<Walker
					className="left-[calc(50%_+_var(--girl-x)_-_var(--walk)*0.44)] w-[calc(var(--walk)*0.88)]"
					kid="girl"
				/>
				<span
					aria-hidden="true"
					className="absolute bottom-[calc(var(--walk)*0.2)] left-[calc(50%_+_var(--star-wx)_-_var(--walk)*0.4)] aspect-square w-[calc(var(--walk)*0.8)]"
					data-anchor="walk-star"
				>
					<Image
						alt=""
						className="motion-safe:hidden"
						fill
						sizes="240px"
						src="/star/star-rest.webp"
					/>
				</span>
			</div>
		</div>
	);
}

function ChooseScene() {
	return (
		<div
			className={`${SCENE} md:justify-end md:pr-[4vw] motion-reduce:md:justify-center motion-reduce:md:pr-0`}
			data-scene="choose"
		>
			<ul className="flex flex-col items-center gap-9 md:flex-row md:gap-[3vw]">
				{CHOICES.map((choice) => (
					<li className="relative" key={choice.name}>
						<div
							className="relative aspect-video w-[min(80vw,36svh*16/9)] md:w-[min(25vw,44svh*16/9)]"
							data-card
						>
							<div
								className={`rounded-card absolute inset-0 overflow-hidden ${MEDALLION}`}
							>
								<Image
									alt=""
									className="object-cover"
									fill
									sizes="(min-width: 768px) 25vw, 80vw"
									src={choice.src}
								/>
							</div>
							<span
								className={`${PLATE} absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 px-4 py-1.5 text-[clamp(14px,1.5vw,20px)] whitespace-nowrap`}
							>
								{choice.name}
							</span>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

// The end of the page: the badges again, then the footer line.
function GoodnightScene() {
	return (
		<div
			className={`absolute inset-x-0 bottom-[calc(var(--kid)*0.75)] z-40 flex flex-col items-center gap-3 px-3 md:bottom-[4svh] ${HIDDEN} motion-reduce:static motion-reduce:pb-10`}
			data-scene="goodnight"
		>
			<StoreBadges />
			<p className="text-cream/60 text-[15px] font-bold">{FOOTER_LINE}</p>
		</div>
	);
}

// The cast, in one place: kids, phone, the star. Pinned in place by the
// timeline; reduced motion makes it the first block after the hero.
function Cast() {
	return (
		<div className="absolute inset-0 motion-reduce:relative motion-reduce:inset-auto motion-reduce:h-svh">
			<Kid className="bottom-[var(--kid-y)] left-[var(--kid-x)]" side="left">
				<CastTake beats={["hello"]} name="boy-watch" />
				<CastTake beats={["ask"]} name="boy-ask" />
				<CastTake beats={["star"]} name="boy-wow" />
				<CastTake beats={["goodnight"]} name="boy-yawn" />
			</Kid>
			<Kid className="right-[var(--kid-x)] bottom-[var(--kid-y)]" side="right">
				<CastTake beats={["hello", "ask"]} name="girl-watch" />
				<CastTake beats={["star"]} name="girl-wow" />
				<CastTake beats={["goodnight"]} name="girl-yawn" />
			</Kid>
			<div className="absolute inset-0 z-10 flex items-center justify-center pt-[8svh]">
				<div
					className="aspect-[390/844] h-[var(--phone-h)]"
					data-anchor="phone"
				>
					<Phone className="size-full" />
				</div>
			</div>
			<div
				aria-hidden="true"
				className="absolute top-[var(--star-y)] left-[var(--star-x)] z-30 aspect-square w-[var(--star-w)] motion-reduce:hidden"
				data-star-slot
			>
				<div className={`absolute inset-0 ${HIDDEN}`} data-star>
					<CastTake beats={["star", "adventure", "choose"]} name="star-idle" />
					<CastTake beats={["star"]} name="star-jump" then="star-idle" />
					<CastTake beats={["goodnight"]} name="star-goodnight" />
				</div>
			</div>
		</div>
	);
}

const SCENES: Partial<Record<BeatId, () => JSX.Element>> = {
	adventure: AdventureScene,
	ask: AskScene,
	choose: ChooseScene,
	goodnight: GoodnightScene,
};

const WIDE = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
const NARROW = "(max-width: 767px) and (prefers-reduced-motion: no-preference)";
const TOUCH = "(hover: none) and (pointer: coarse)";
// One scroll gesture moves exactly one beat, in either direction. Plain
// "labels" snaps a single wheel notch back, and velocity projection skips beats.
// Scroll distance per beat, in viewport heights. Above 1 so one PageDown never skips a beat.
const BEAT_SCROLL = 1.1;

const SNAP = {
	delay: 0.05,
	duration: { max: 0.5, min: 0.2 },
	ease: "power1.inOut",
	inertia: false,
	snapTo: "labelsDirectional",
} as const;

export function StoryStage() {
	const stageRef = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			const stage = stageRef.current;
			if (!stage) {
				return;
			}
			ScrollTrigger.config({ ignoreMobileResize: true });
			const mm = gsap.matchMedia();
			mm.add({ narrow: NARROW, wide: WIDE }, (context) => {
				const wide = Boolean(context.conditions?.wide);
				// One controller for every video: on a new beat, its takes play and
				// the rest stop. Nothing else starts or stops a video.
				let current = -1;
				const sync = () => {
					const index = beatAt(tl.time());
					if (index !== current) {
						current = index;
						syncTakes(stage, beats[index].id, beats[index + 1]?.id);
					}
				};
				const tl = gsap.timeline({
					scrollTrigger: {
						anticipatePin: 1,
						end: () =>
							`+=${(beats.length - 1) * window.innerHeight * BEAT_SCROLL}`,
						invalidateOnRefresh: true,
						pin: stage,
						scrub: 0.4,
						snap: SNAP,
						start: "top top",
						trigger: stage,
					},
				});
				buildStory(tl, stage, wide, !wide || window.matchMedia(TOUCH).matches);
				tl.eventCallback("onUpdate", sync);
				// The hero is alive before any scroll: start the first beat's takes after first paint.
				const frame = requestAnimationFrame(sync);
				return () => {
					cancelAnimationFrame(frame);
					stopTakes(stage);
				};
			});
			document.fonts.ready.then(() => ScrollTrigger.refresh());
		},
		{ scope: stageRef }
	);

	return (
		<div
			className={`${STAGE_VARS} relative isolate h-svh overflow-hidden motion-reduce:h-auto`}
			id="story"
			ref={stageRef}
		>
			<ol>
				{beats.map((beat, index) => {
					const Scene = SCENES[beat.id];
					return (
						<li
							className="motion-reduce:flex motion-reduce:flex-col motion-reduce:items-center motion-reduce:gap-6 motion-reduce:py-10"
							key={beat.id}
						>
							{index === 0 ? (
								<>
									<Hero />
									<Cast />
								</>
							) : (
								<p
									className={`text-cream absolute inset-x-0 top-[5svh] z-40 mx-auto max-w-[30ch] px-6 text-center text-[clamp(26px,3.4vw,44px)] leading-[1.1] font-black text-balance ${HIDDEN} motion-reduce:static`}
									data-caption={beat.id}
								>
									{beat.caption}
								</p>
							)}
							{Scene ? <Scene /> : null}
						</li>
					);
				})}
			</ol>
		</div>
	);
}
