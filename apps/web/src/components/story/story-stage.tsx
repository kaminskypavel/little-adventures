"use client";

import Image from "next/image";
import { type ComponentType, useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { type BeatId, beats } from "./beats";
import { KidPlaceholder } from "./kid-placeholder";
import { Phone } from "./phone";
import { StarTake } from "./star-take";
import { buildStory } from "./story-timeline";

// Placeholder scenes. The pictures are illustrations, not buttons, so they
// stay flat: no clay lift, no press, no pointer cursor.
const PLACES = [
	{ name: "The box", src: "/places/the-box.jpg" },
	{ name: "Whale songs", src: "/places/whale-songs.jpg" },
	{ name: "Earth rise", src: "/places/earth-rise.jpg" },
	{ name: "Glow flowers", src: "/places/glow-flowers.jpg" },
] as const;

const CHOICES = [
	{ name: "Whale songs", src: "/places/whale-songs.jpg" },
	{ name: "Earth rise", src: "/places/earth-rise.jpg" },
] as const;

/** How far each of the five map stops sits below the top of the arc, in px. */
const ARC = [26, 8, 0, 8, 26] as const;

const MEDALLION = "shadow-[0_6px_8px_-3px_rgba(0,0,0,0.5)]";
const PLATE =
	"rounded-plate bg-sand px-2.5 py-0.5 text-center font-black text-ink-navy leading-tight";

// Shared geometry. Phone first, then md and up. Every box is sized from these.
const STAGE_VARS = [
	"[--phone-h:50svh] md:[--phone-h:62svh]",
	"[--phone-w:calc(var(--phone-h)*390/844)]",
	"[--kid-h:26svh] md:[--kid-h:min(44svh,28vw)]",
	"[--kid-w:calc(var(--kid-h)*0.6)]",
	"[--kid-x:calc(var(--kid-w)*-0.3)] md:[--kid-x:max(1rem,calc(50%_-_var(--phone-w)/2_-_5svh_-_var(--kid-w)))]",
	"[--kid-y:-2svh] md:[--kid-y:0px]",
	"[--star-w:16svh] md:[--star-w:20svh]",
	"[--star-x:calc(50%_+_var(--phone-w)/2_-_6svh)] md:[--star-x:calc(50%_+_var(--phone-w)/2_+_1svh)]",
	"[--star-y:20svh] md:[--star-y:24svh]",
	"[--place:64px] md:[--place:86px]",
].join(" ");

// Beats other than the first start hidden. Reduced motion shows them all.
const HIDDEN = "motion-safe:invisible motion-safe:opacity-0";

const SCENE = `absolute inset-0 z-20 flex items-center justify-center pt-[8svh] ${HIDDEN} motion-reduce:static motion-reduce:w-full motion-reduce:pt-10 motion-reduce:pb-10`;

function AskScene() {
	return (
		<div className={SCENE} data-scene="ask">
			<p
				className={`${PLATE} absolute bottom-[calc(var(--kid-h)_+_var(--kid-y)_+_2svh)] left-[max(1rem,var(--kid-x))] px-4 py-2 text-[clamp(16px,1.7vw,22px)] motion-reduce:static`}
				data-pop
			>
				Why do whales sing?
			</p>
		</div>
	);
}

function MapScene() {
	return (
		<div className={SCENE} data-scene="map">
			<ul className="flex w-[min(94vw,760px)] items-start justify-between">
				{PLACES.map((place, index) => (
					<li
						className="flex flex-col items-center gap-1.5"
						key={place.name}
						style={{ marginTop: ARC[index] }}
					>
						<div
							className="relative size-[var(--place)]"
							data-anchor={index === 0 ? "place" : undefined}
						>
							<div
								className={`absolute inset-0 overflow-hidden rounded-full ${MEDALLION}`}
								data-item
							>
								<Image
									alt=""
									className="object-cover"
									fill
									sizes="96px"
									src={place.src}
								/>
							</div>
						</div>
						<span
							className={`${PLATE} max-w-[calc(var(--place)+8px)] text-[10px] md:text-[13px]`}
							data-item
						>
							{place.name}
						</span>
					</li>
				))}
				<li style={{ marginTop: ARC[4] }}>
					<div
						className={`bg-deep-navy text-cream grid size-[var(--place)] place-items-center rounded-full text-[11px] font-black md:text-[14px] ${MEDALLION}`}
						data-item
					>
						Goodnight
					</div>
				</li>
			</ul>
		</div>
	);
}

function ChooseScene() {
	return (
		<div className={SCENE} data-scene="choose">
			<ul className="flex flex-col items-center gap-9 md:flex-row md:gap-[4vw]">
				{CHOICES.map((choice, index) => (
					<li className="relative" key={choice.name}>
						{index === 0 ? (
							<span
								className="absolute top-0 left-0 size-0"
								data-anchor="choose"
							/>
						) : null}
						<div
							className="relative aspect-video w-[min(84vw,38svh)] md:w-[min(36vw,52svh)]"
							data-card
						>
							<div
								className={`rounded-card absolute inset-0 overflow-hidden ${MEDALLION}`}
							>
								<Image
									alt=""
									className="object-cover"
									fill
									sizes="(min-width: 768px) 36vw, 84vw"
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

// Beats that bring their own placeholder scene. The others just move the cast.
const SCENES: Partial<Record<BeatId, ComponentType>> = {
	ask: AskScene,
	choose: ChooseScene,
	map: MapScene,
};

const WIDE = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
const NARROW = "(max-width: 767px) and (prefers-reduced-motion: no-preference)";
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
				buildStory(tl, stage, Boolean(context.conditions?.wide));
			});
			document.fonts.ready.then(() => ScrollTrigger.refresh());
		},
		{ scope: stageRef }
	);

	return (
		<section aria-label="How an adventure goes" id="story">
			<div
				className={`${STAGE_VARS} relative isolate h-svh overflow-hidden motion-reduce:h-auto`}
				ref={stageRef}
			>
				{/* The cast. Pinned in place; reduced motion makes it the first block. */}
				<div className="absolute inset-0 motion-reduce:relative motion-reduce:inset-auto motion-reduce:h-svh">
					<KidPlaceholder
						className="absolute bottom-[var(--kid-y)] left-[var(--kid-x)] h-[var(--kid-h)] w-[var(--kid-w)]"
						side="left"
					/>
					<KidPlaceholder
						className="absolute right-[var(--kid-x)] bottom-[var(--kid-y)] h-[var(--kid-h)] w-[var(--kid-w)]"
						side="right"
					/>
					<div className="absolute inset-0 z-10 flex items-center justify-center pt-[8svh]">
						<Phone className="h-[var(--phone-h)]" />
					</div>
					<div
						className="absolute top-[var(--star-y)] left-[var(--star-x)] z-30 aspect-square w-[var(--star-w)]"
						data-star-slot
					>
						<div className={`absolute inset-0 ${HIDDEN}`} data-star>
							<StarTake className="w-full" />
						</div>
					</div>
				</div>

				<ol>
					{beats.map((beat, index) => {
						const Scene = SCENES[beat.id];
						return (
							<li
								className="motion-reduce:flex motion-reduce:flex-col motion-reduce:items-center motion-reduce:gap-6 motion-reduce:py-10"
								key={beat.id}
							>
								<p
									className={`text-cream absolute inset-x-0 top-[5svh] z-40 mx-auto max-w-[30ch] px-6 text-center text-[clamp(26px,3.4vw,44px)] leading-[1.1] font-black text-balance motion-reduce:static ${index === 0 ? "" : HIDDEN}`}
									data-caption={beat.id}
								>
									{beat.caption}
								</p>
								{Scene ? <Scene /> : null}
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}
