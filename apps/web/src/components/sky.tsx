"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { mulberry32 } from "@/lib/seeded-random";

// The sky was drawn at 0.72 scale; every size below is that drawing converted to CSS px.
const SCALE = 0.72;
const pt = (px: number) => px / SCALE;
// Phone width the drift distances were drawn for. They grow with the window up to MAX_TRAVEL.
const BASE_WIDTH = 390;
const MIN_TRAVEL = 0.85;
const MAX_TRAVEL = 1.5;
// The band tiles must cover the widest window we plan for, plus one tile to wrap into.
const COVER_WIDTH = 2560;
const BAND_FADE = Math.round(pt(36));
const BAND_FADE_MASK = `linear-gradient(to bottom, #000 calc(100% - ${BAND_FADE}px), transparent 100%)`;

const dim = (brightness: number, saturate = 1) =>
	`brightness(${brightness}) saturate(${saturate})`;

// ---- Bottom band: two parallax layers wrapping by exactly one tile ----

const bands = [
	{
		bottom: pt(42),
		brightness: 0.38,
		duration: 112,
		fade: true,
		height: Math.round(pt(90)),
		key: "band-back",
		opacity: 0.45,
		startAt: 60,
		tileWidth: Math.round(pt(509)),
	},
	{
		bottom: pt(-6),
		brightness: 0.42,
		duration: 70,
		fade: false,
		height: Math.round(pt(104)),
		key: "band-front",
		opacity: 0.85,
		startAt: 18,
		tileWidth: Math.round(pt(587)),
	},
].map((b) => ({
	...b,
	tileCount: Math.ceil(COVER_WIDTH / b.tileWidth) + 1,
	tileIds: Array.from(
		{ length: Math.ceil(COVER_WIDTH / b.tileWidth) + 1 },
		(_, n) => `${b.key}-tile-${n}`
	),
}));

// ---- Side clouds: drift back and forth ----

const sideClouds = [
	{
		brightness: 0.62,
		drift: pt(-150),
		duration: 34,
		height: Math.round(pt(72)),
		image: "/sky/cloud-2.webp",
		imageHeight: 394,
		key: "cloud-right",
		opacity: 0.55,
		place: { right: pt(-34) },
		startAt: 9,
		top: "36%",
		width: Math.round(pt(120)),
	},
	{
		brightness: 0.62,
		drift: pt(-140),
		duration: 41,
		height: Math.round(pt(86)),
		image: "/sky/cloud-4.webp",
		imageHeight: 479,
		key: "cloud-left",
		opacity: 0.38,
		place: { left: pt(-30) },
		startAt: 31,
		top: "20%",
		width: Math.round(pt(104)),
	},
] as const;

const topCloud = {
	duration: 95,
	height: Math.round(pt(62)),
	startAt: 40,
	width: Math.round(pt(132)),
};

// ---- Stars: generated once at module load so server and client agree ----

const STAR_COUNT = 34;
const STAR_SEED = 13;
const STAR_REST_OPACITY = 0.75;

const stars = (() => {
	const random = mulberry32(STAR_SEED);
	return Array.from({ length: STAR_COUNT }, (_, id) => {
		const big = random() < 0.12;
		const size = pt(big ? 2.6 + random() * 0.9 : 1.2 + random() * 1.4);
		return {
			cycle: 2.4 + random() * 3.8, // one full dim, bright, dim loop
			id,
			left: `${(random() * 98).toFixed(1)}%`,
			size: Number(size.toFixed(2)),
			startAt: random() * 8,
			top: `${(random() * 94).toFixed(1)}%`,
		};
	});
})();

export function Sky() {
	const root = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			const mm = gsap.matchMedia();
			mm.add({ motion: "(prefers-reduced-motion: no-preference)" }, () => {
				const width = window.innerWidth;
				const travel = Math.min(
					MAX_TRAVEL,
					Math.max(MIN_TRAVEL, width / BASE_WIDTH)
				);

				// ponytail: sized once at mount; a window resized wider mid-session wraps the top cloud early.
				gsap
					.fromTo(
						'[data-sky="cloud-top"]',
						{ x: -topCloud.width },
						{
							duration: topCloud.duration,
							ease: "none",
							repeat: -1,
							x: width,
						}
					)
					.totalTime(topCloud.startAt);

				for (const c of sideClouds) {
					gsap
						.fromTo(
							`[data-sky="${c.key}"]`,
							{ x: 0, y: pt(-6) },
							{
								duration: c.duration,
								ease: "sine.inOut",
								repeat: -1,
								x: c.drift * travel,
								y: pt(8),
								yoyo: true,
							}
						)
						.totalTime(c.startAt);
				}

				for (const b of bands) {
					gsap
						.fromTo(
							`[data-sky="${b.key}"]`,
							{ x: 0 },
							{
								duration: b.duration,
								ease: "none",
								repeat: -1,
								x: -b.tileWidth,
							}
						)
						.totalTime(b.startAt);
				}

				for (const s of stars) {
					gsap
						.fromTo(
							`[data-star="${s.id}"]`,
							{ opacity: 0.1, scale: 0.6 },
							{
								duration: s.cycle / 2,
								ease: "sine.inOut",
								opacity: 1,
								repeat: -1,
								scale: 1.15,
								yoyo: true,
							}
						)
						.totalTime(s.startAt);
				}
			});
			return () => mm.revert();
		},
		{ scope: root }
	);

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
			ref={root}
			style={{ background: "var(--sky-puffy)" }}
		>
			<div className="absolute inset-0" data-sky-clouds>
				<div
					className="absolute left-0 will-change-transform"
					data-sky="cloud-top"
					style={{
						filter: dim(0.62),
						height: topCloud.height,
						opacity: 0.4,
						top: "7%",
						width: topCloud.width,
					}}
				>
					<Image
						alt=""
						aria-hidden="true"
						className="size-full object-contain"
						height={314}
						sizes={`${topCloud.width}px`}
						src="/sky/cloud-1.webp"
						width={640}
					/>
				</div>

				{sideClouds.map((c) => (
					<div
						className="absolute will-change-transform"
						data-sky={c.key}
						key={c.key}
						style={{
							...c.place,
							filter: dim(c.brightness),
							height: c.height,
							opacity: c.opacity,
							top: c.top,
							width: c.width,
						}}
					>
						<Image
							alt=""
							aria-hidden="true"
							className="size-full object-contain"
							height={c.imageHeight}
							sizes={`${c.width}px`}
							src={c.image}
							width={640}
						/>
					</div>
				))}

				{bands.map((b) => (
					<div
						className="absolute left-0 w-full"
						key={b.key}
						style={{
							bottom: b.bottom,
							height: b.height,
							opacity: b.opacity,
							...(b.fade
								? { maskImage: BAND_FADE_MASK, WebkitMaskImage: BAND_FADE_MASK }
								: null),
						}}
					>
						<div
							className="will-change-transform"
							data-sky={b.key}
							style={{
								height: b.height,
								width: b.tileWidth * b.tileCount,
							}}
						>
							<div
								className="flex size-full"
								style={{ filter: dim(b.brightness, 0.85) }}
							>
								{b.tileIds.map((id) => (
									<Image
										alt=""
										aria-hidden="true"
										className="shrink-0"
										height={230}
										key={id}
										sizes={`${b.tileWidth}px`}
										src="/sky/cloud-band.webp"
										style={{ height: b.height, width: b.tileWidth }}
										width={1298}
									/>
								))}
							</div>
						</div>
					</div>
				))}
			</div>

			{stars.map((s) => (
				<div
					className="absolute rounded-full"
					data-star={s.id}
					key={s.id}
					style={{
						backgroundColor: "#FFFFFF",
						boxShadow: `0 0 ${(s.size * 2.5).toFixed(1)}px rgba(255,255,255,0.75)`,
						height: s.size,
						left: s.left,
						opacity: STAR_REST_OPACITY,
						top: s.top,
						width: s.size,
					}}
				/>
			))}
		</div>
	);
}
