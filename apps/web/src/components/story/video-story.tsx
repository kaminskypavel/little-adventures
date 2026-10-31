"use client";

import { useRef } from "react";
import { StoreBadges } from "@/components/waitlist/store-badges";
import { Wordmark } from "@/components/wordmark";
import type { Dictionary, SceneId } from "@/i18n/dictionaries";
import { gsap, Observer, useGSAP } from "@/lib/gsap";
import { GATE, loadPlan, type Screen, storyUrls } from "./story-plan";
import { createStoryStore } from "./story-store";

// The landing story: seven scenes joined by short video moves. One gesture plays
// one move; the scene then rests on a one second back-and-forth loop.
// Copy lives in the language dictionaries: questions show as yellow quotes, each line names a feature.
const SCENE_IDS: readonly SceneId[] = [
	"playroom",
	"star",
	"moon",
	"saturn",
	"ocean",
	"dinosaurs",
	"goodnight",
];
const N = SCENE_IDS.length;
const MOVE_SPEED = 1.2;
// After a move, swallow a trackpad's leftover momentum so one swipe is one scene.
const CALM_MS = 350;
const CUE_ARROWS = ["first", "second", "third"] as const;
const LAYER = "absolute inset-0 size-full object-cover opacity-0";
const TITLE =
	"mb-[0.32em] text-balance font-black text-[length:clamp(28px,4.3vw,66px)] leading-[1.04] tracking-[-0.01em] [text-shadow:0_3px_0_rgba(18,37,74,0.55),0_10px_22px_rgba(0,0,0,0.45)] max-[899px]:text-[length:clamp(28px,8.6vw,40px)]";

const NAV_KEYS = {
	back: ["ArrowUp", "PageUp"],
	next: ["ArrowDown", "PageDown", " "],
};

export function VideoStory({ copy }: { copy: Dictionary }) {
	const root = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			const el = root.current;
			if (!el) {
				return;
			}
			const all = <T extends Element>(sel: string) => [
				...el.querySelectorAll<T>(sel),
			];
			const stills = all<HTMLImageElement>("[data-still]");
			const loops = all<HTMLVideoElement>("[data-loop]");
			const moves = [null, ...all<HTMLVideoElement>("[data-move]")];
			const backs = [null, ...all<HTMLVideoElement>("[data-back]")];
			const copies = all<HTMLElement>("[data-copy]");
			const dots = all<HTMLElement>("[data-dot]");
			const loader = el.querySelector<HTMLElement>("[data-loader]");
			const bar = el.querySelector<HTMLElement>("[data-bar]");
			const hint = el.querySelector<HTMLElement>("[data-hint]");

			const probe = document.createElement("video");
			const codec = probe.canPlayType('video/mp4; codecs="av01.0.12M.08"')
				? ""
				: "-hevc";
			const screenNow: Screen = {
				big: !codec && screen.width * devicePixelRatio >= 3400,
				calm: matchMedia("(prefers-reduced-motion: reduce)").matches,
				codec,
				tall: matchMedia("(max-aspect-ratio: 1/1)").matches,
			};
			const { calm } = screenNow;
			const url = storyUrls(screenNow);

			// ---- Loading: whole files into blob URLs, so playback never waits on the network ----
			const blobs: string[] = [];
			let alive = true;
			const media = { loop: loops, move: moves, still: stills };
			const plan = loadPlan(screenNow).map((item) => ({
				...item,
				media: media[item.kind][item.index] as
					| HTMLImageElement
					| HTMLVideoElement,
			}));
			const readWhole = async (res: Response, onBytes: (n: number) => void) => {
				const reader = res.body?.getReader();
				const parts: BlobPart[] = [];
				while (reader) {
					// biome-ignore lint/performance/noAwaitInLoops: a stream is read one chunk after another.
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					parts.push(value);
					onBytes(value.length);
				}
				const blobUrl = URL.createObjectURL(
					new Blob(parts, { type: res.headers.get("content-type") ?? "" })
				);
				blobs.push(blobUrl);
				return blobUrl;
			};
			// After the loading screen, files load one at a time in the order asked for. A file
			// an element already plays (it was needed before its turn) is never swapped under it.
			let queue = Promise.resolve();
			const fill = async (
				m: HTMLImageElement | HTMLVideoElement,
				src: string
			) => {
				if (!alive || m.getAttribute("src")) {
					return;
				}
				let file = src;
				try {
					file = await readWhole(await fetch(src), () => undefined);
				} catch {
					// No streaming download: the element fetches the file itself.
				}
				if (alive && !m.getAttribute("src")) {
					m.src = file;
				}
			};
			const queueLoad = (
				m: HTMLImageElement | HTMLVideoElement,
				src: string
			) => {
				queue = queue.then(() => fill(m, src));
			};
			const loadAll = async (onProgress: (p: number) => void) => {
				const gate = plan.filter((f) => f.scene < GATE);
				const later = plan.filter((f) => f.scene >= GATE);
				try {
					const heads = await Promise.all(
						gate.map(async (f) => ({ ...f, res: await fetch(f.src) }))
					);
					const total =
						heads.reduce(
							(a, f) => a + Number(f.res.headers.get("content-length") ?? 0),
							0
						) || 1;
					let got = 0;
					await Promise.all(
						heads.map(async (f) => {
							f.media.src = await readWhole(f.res, (n) => {
								got += n;
								onProgress(got / total);
							});
						})
					);
				} catch {
					// No streaming download: let the elements fetch their files directly.
					for (const f of gate) {
						f.media.src = f.src;
					}
				}
				onProgress(1);
				for (const f of later) {
					queueLoad(f.media, f.src);
				}
			};

			// ---- Showing scenes ----
			const layers = [...stills, ...loops, ...moves, ...backs].filter(
				Boolean
			) as HTMLElement[];
			const only = (layer: HTMLElement) => {
				for (const x of layers) {
					gsap.set(x, { opacity: x === layer ? 1 : 0 });
				}
			};
			// Show a video only once its first frame is on screen, never a stale or empty frame.
			const whenFrame = (v: HTMLVideoElement, fn: () => void) => {
				if ("requestVideoFrameCallback" in v) {
					v.requestVideoFrameCallback(() => fn());
				} else {
					(v as HTMLVideoElement).addEventListener("playing", fn, {
						once: true,
					});
				}
			};
			const story = createStoryStore();
			const sceneNow = () => story.getState().at;
			const rest = (i: number) => {
				only(stills[i]);
				if (calm) {
					return;
				}
				const v = loops[i];
				v.currentTime = 0;
				v.onended = () => {
					v.currentTime = 0;
					v.play().catch(() => undefined);
				};
				whenFrame(v, () => {
					if (sceneNow() === i) {
						only(v);
					}
				});
				v.play().catch(() => undefined);
			};
			// One dot per scene: the scene you are on is a long pill, the ones behind you stay lit.
			const setDots = (i: number) => {
				const [small, long] = matchMedia("(max-width: 899px)").matches
					? [9, 34]
					: [12, 44];
				dots.forEach((d, k) => {
					gsap.to(d, {
						duration: 0.28,
						ease: "brandOut",
						height: k === i ? long : small,
					});
					gsap.to(d.firstElementChild, {
						duration: 0.3,
						height: k <= i ? "100%" : "0%",
					});
				});
			};
			const swapCopy = (from: number, to: number) => {
				// overwrite: a queued swipe can leave a scene before its line finished fading in.
				gsap.to(copies[from], {
					autoAlpha: 0,
					duration: 0.25,
					overwrite: true,
				});
				gsap.fromTo(
					copies[to],
					{ autoAlpha: 0, y: 24 },
					{
						autoAlpha: 1,
						delay: 0.3,
						duration: 0.45,
						ease: "brandOut",
						overwrite: true,
						y: 0,
					}
				);
			};
			// The way back from a scene loads while the move into it plays, ahead of the files
			// still queued for later scenes, so scrolling up right after landing never waits.
			const warmBack = (scene: number) => {
				const clip = backs[scene];
				if (clip && !calm) {
					fill(clip, url.back(scene));
				}
			};
			const arrive = (to: number) => {
				const queued = story.getState().arrive(to, CALM_MS);
				rest(to);
				if (queued) {
					go(queued, true);
				}
			};

			// Reduced motion: a short fade between the scenes' stills.
			const fadeTo = (to: number) => {
				only(stills[to]);
				gsap.fromTo(
					stills[to],
					{ opacity: 0 },
					{ duration: 0.4, onComplete: () => arrive(to), opacity: 1 }
				);
			};
			const playMove = (from: number, to: number) => {
				const forward = to > from;
				const clip = forward ? moves[to] : backs[from];
				if (!clip) {
					arrive(to);
					return;
				}
				// Not loaded yet (a fast visitor, or the way back still loading): stream it.
				if (!clip.getAttribute("src")) {
					clip.src = forward ? url.move(to) : url.back(from);
				}
				clip.currentTime = 0;
				clip.playbackRate = MOVE_SPEED;
				whenFrame(clip, () => only(clip));
				clip.onended = () => arrive(to);
				clip.play().catch(() => arrive(to));
			};

			// `step` is +1 or -1. A touch swipe skips the trackpad calm window, and one made
			// during a move is kept and played when the move lands.
			const go = (step: number, touch = false) => {
				const state = story.getState();
				const to = state.at + step;
				if (!state.canGo(to, N, touch)) {
					if (touch) {
						state.queueSwipe(step);
					}
					return;
				}
				state.leave();
				warmBack(to);
				cueLoop.kill();
				gsap.to(hint, {
					autoAlpha: 0,
					duration: 0.35,
					ease: "brandOut",
					overwrite: true,
				});
				const from = sceneNow();
				loops[from].pause();
				swapCopy(from, to);
				setDots(to);
				if (calm) {
					fadeTo(to);
				} else {
					playMove(from, to);
				}
			};

			// The scroll cue sits under the first scene's line. It rises in once the story shows and
			// fades out on the first move; while it shows, the mouse wheel rolls down and a soft wave
			// runs down the three arrows. Reduced motion: a plain fade, everything shown, no loop.
			gsap.set(hint, { autoAlpha: 0 });
			const cueLoop = gsap.timeline({ paused: true, repeat: -1 });
			if (calm) {
				gsap.set("[data-cue-wheel], [data-cue-arrow]", { opacity: 1 });
			} else {
				cueLoop
					.fromTo(
						"[data-cue-wheel]",
						{ opacity: 0, y: 0 },
						{ duration: 0.24, ease: "none", opacity: 1 }
					)
					.to("[data-cue-wheel]", {
						duration: 0.88,
						ease: "brandOut",
						opacity: 0,
						y: 16,
					})
					.to(
						"[data-cue-arrow]",
						{
							duration: 0.56,
							ease: "sine.inOut",
							opacity: 1,
							repeat: 1,
							stagger: 0.2,
							yoyo: true,
						},
						0
					)
					.to({}, { duration: 0.48 });
			}
			const showHint = () => {
				gsap.fromTo(
					hint,
					calm
						? { autoAlpha: 0 }
						: { autoAlpha: 0, filter: "blur(3px)", y: 12 },
					{
						autoAlpha: 1,
						delay: 0.6,
						duration: 0.5,
						ease: "brandOut",
						filter: "blur(0px)",
						onComplete: () => {
							cueLoop.play();
						},
						y: 0,
					}
				);
			};

			// ---- Start: the star bobs over the progress bar, then the story fades in ----
			gsap.set(copies.slice(1), { autoAlpha: 0 });
			setDots(0);
			const spin = gsap.to("[data-loader-star]", {
				duration: 0.7,
				ease: "sine.inOut",
				repeat: -1,
				rotation: 8,
				y: -12,
				yoyo: true,
			});
			loadAll((p) =>
				gsap.to(bar, {
					duration: 0.25,
					overwrite: true,
					width: `${Math.round(p * 100)}%`,
				})
			).then(() => {
				if (!alive) {
					return;
				}
				gsap.to(loader, {
					autoAlpha: 0,
					delay: 0.25,
					duration: 0.5,
					onComplete: () => spin.kill(),
				});
				rest(0);
				showHint();
			});

			const observer = Observer.create({
				onDown: (self) => go(-1, self.event.type !== "wheel"),
				onPress: () => story.getState().press(),
				onUp: (self) => go(1, self.event.type !== "wheel"),
				preventDefault: true,
				target: window,
				tolerance: 10,
				type: "wheel,touch,pointer",
				wheelSpeed: -1,
			});
			const onKey = (e: KeyboardEvent) => {
				// Typing in the waitlist form must never move the story.
				if (
					(e.target as HTMLElement).closest("input, textarea, dialog, button")
				) {
					return;
				}
				if (NAV_KEYS.next.includes(e.key)) {
					go(1);
				}
				if (NAV_KEYS.back.includes(e.key)) {
					go(-1);
				}
			};
			addEventListener("keydown", onKey);
			// The other screen shape needs the other set of files.
			const shapeQuery = matchMedia("(max-aspect-ratio: 1/1)");
			const onShape = () => location.reload();
			shapeQuery.addEventListener("change", onShape);

			return () => {
				alive = false;
				observer.kill();
				removeEventListener("keydown", onKey);
				shapeQuery.removeEventListener("change", onShape);
				for (const b of blobs) {
					URL.revokeObjectURL(b);
				}
			};
		},
		{ scope: root }
	);

	return (
		<div ref={root}>
			<div
				aria-hidden="true"
				className="fixed inset-0 bg-[#050b18] [@media(min-aspect-ratio:16/9)]:right-auto [@media(min-aspect-ratio:16/9)]:left-1/2 [@media(min-aspect-ratio:16/9)]:w-[177.78vh] [@media(min-aspect-ratio:16/9)]:-translate-x-1/2 [@media(min-aspect-ratio:16/9)]:[mask-image:linear-gradient(90deg,transparent_0,#000_6%,#000_94%,transparent_100%)]"
			>
				{SCENE_IDS.map((id, i) => (
					// biome-ignore lint/performance/noImgElement: frames load as blob URLs, which next/image cannot serve.
					<img
						alt=""
						className={LAYER}
						data-still={i}
						height={1080}
						key={`still-${id}`}
						width={1920}
					/>
				))}
				{SCENE_IDS.map((id, i) => (
					<video
						className={LAYER}
						data-loop={i}
						key={`loop-${id}`}
						muted
						playsInline
						preload="none"
					/>
				))}
				{SCENE_IDS.slice(1).map((id, k) => (
					<video
						className={LAYER}
						data-move={k + 1}
						key={`move-${id}`}
						muted
						playsInline
						preload="none"
					/>
				))}
				{SCENE_IDS.slice(1).map((id, k) => (
					<video
						className={LAYER}
						data-back={k + 1}
						key={`back-${id}`}
						muted
						playsInline
						preload="none"
					/>
				))}
			</div>
			<div className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-[42vh] bg-[linear-gradient(180deg,rgba(5,11,24,0.72)_0%,rgba(5,11,24,0.35)_55%,rgba(5,11,24,0)_100%)]" />

			{SCENE_IDS.map((id, i) => {
				const scene = copy.scenes[id];
				return (
					<section
						className="fixed top-[6vh] left-1/2 z-[2] w-[min(94vw,1100px)] -translate-x-1/2 text-center max-[899px]:top-[max(68px,8svh)]"
						data-copy={i}
						key={id}
					>
						{i === 0 ? (
							<Wordmark className="mb-[0.28em] leading-none text-[length:clamp(46px,8vw,116px)] max-[899px]:text-[length:clamp(50px,14vw,60px)]" />
						) : null}
						{scene.question ? (
							<h2 className={`${TITLE} text-sun`}>
								{copy.quote[0]}
								{scene.question}
								{copy.quote[1]}
							</h2>
						) : null}
						{scene.title ? <h2 className={TITLE}>{scene.title}</h2> : null}
						<p className="text-cream/90 mb-[1.2em] leading-[1.38] text-balance text-[length:clamp(17px,1.55vw,24px)] [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] max-[899px]:text-[length:clamp(17px,4.9vw,20px)]">
							{scene.line}
						</p>
						{i === 0 ? (
							<div
								className="invisible mt-[2.5vh] flex justify-center"
								data-hint
							>
								<div className="text-cream flex flex-col items-center gap-2.5 [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.6))]">
									<span
										aria-hidden="true"
										className="relative h-14 w-9 rounded-[20px] border-[3px] border-current pointer-coarse:hidden"
									>
										<span
											className="bg-sun-hi absolute top-[9px] left-1/2 -ml-[3px] h-2.5 w-1.5 rounded-sm opacity-0"
											data-cue-wheel
										/>
									</span>
									<span className="flex flex-col items-center">
										{CUE_ARROWS.map((arrow) => (
											<svg
												aria-hidden="true"
												className="-mt-1 h-3 w-[22px] opacity-[0.15] pointer-coarse:h-3.5 pointer-coarse:w-[26px]"
												data-cue-arrow
												fill="none"
												key={arrow}
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2.5}
												viewBox="0 0 22 12"
											>
												<path d="M3 2l8 8 8-8" />
											</svg>
										))}
									</span>
									<span className="text-[16px] font-extrabold whitespace-nowrap opacity-90 pointer-coarse:hidden">
										{copy.hint.scroll}
									</span>
									<span className="hidden text-[15px] font-extrabold whitespace-nowrap opacity-90 pointer-coarse:inline">
										{copy.hint.swipe}
									</span>
								</div>
							</div>
						) : null}
						{i === N - 1 ? <StoreBadges copy={copy} /> : null}
					</section>
				);
			})}

			<div
				aria-hidden="true"
				className="fixed top-1/2 right-[max(16px,2.2vw)] z-[5] flex -translate-y-1/2 flex-col items-center gap-3 max-[899px]:right-2.5 max-[899px]:gap-2.5 [@media(min-aspect-ratio:16/9)]:right-[calc((100vw-177.78vh)/2+2vw)]"
			>
				{SCENE_IDS.map((d) => (
					<span
						className="bg-cream/30 relative size-3 overflow-hidden rounded-full max-[899px]:size-[9px]"
						data-dot
						key={d}
					>
						<span className="bg-sun absolute inset-x-0 top-0 h-0 rounded-full" />
					</span>
				))}
			</div>

			<div
				className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-[18px] bg-[image:var(--sky-puffy)]"
				data-loader
				role="status"
			>
				{/* biome-ignore lint/performance/noImgElement: a tiny decorative picture shown before anything else loads. */}
				<img
					alt=""
					className="h-auto w-[120px]"
					data-loader-star
					height={99}
					src="/loader-star.webp"
					width={120}
				/>
				<p className="text-cream/90 m-0 text-[17px]">{copy.loader}</p>
				<div className="bg-cream/20 h-[5px] w-[200px] overflow-hidden rounded-full">
					<span className="bg-sun block h-full w-0 rounded-full" data-bar />
				</div>
			</div>
		</div>
	);
}
