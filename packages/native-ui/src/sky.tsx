import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useCalm } from "./motion-provider";
import { mulberry32 } from "./seeded-random";
import { colors, layout, type SkyPalette, skyPalettes } from "./tokens";

// Every size below is the round 7 page value (drawn at 0.72 scale), converted to points.
const SCALE = 0.72;
const pt = (px: number) => px / SCALE;
// Round 7 phone screen width in its own px; horizontal travel scales with the real width.
const DRAW_WIDTH = layout.baseWidth * SCALE;

// Round 7 dims the sprites with CSS `brightness()` and `saturate()`. iOS draws `brightness` as a
// box over the whole view and has no `saturate`, so the dimming is baked into the files instead.
const bandFrontSprite = require("../assets/sky/cloud-band-front.webp"); // brightness .42, saturate .85
const bandBackSprite = require("../assets/sky/cloud-band-back.webp"); // brightness .38, saturate .85
const cloudTop = require("../assets/sky/cloud-1-dim.webp"); // brightness .62
const cloudRight = require("../assets/sky/cloud-2-dim.webp");
const cloudLeft = require("../assets/sky/cloud-4-dim.webp");

type Easing = "linear" | "ease-in-out";
interface Offset {
	x: number;
	y: number;
}
interface Drift {
	alternate: boolean;
	delay: number; // seconds, negative = already under way
	duration: number; // seconds
	easing: Easing;
	from: Offset;
	to: Offset;
}

/**
 * One looping drift. Moving: a Reanimated CSS animation (runs on the UI thread on iOS,
 * Android and web). Calm: the same pose the loop would be at when the screen opens, still.
 */
function driftStyle(d: Drift, calm: boolean) {
	if (calm) {
		const cycle = d.alternate ? 2 : 1;
		let p = (-d.delay / d.duration) % cycle;
		if (p > 1) {
			p = 2 - p;
		}
		return {
			transform: [
				{ translateX: d.from.x + (d.to.x - d.from.x) * p },
				{ translateY: d.from.y + (d.to.y - d.from.y) * p },
			],
		};
	}
	return {
		animationDelay: `${d.delay}s`,
		animationDirection: d.alternate
			? ("alternate" as const)
			: ("normal" as const),
		animationDuration: `${d.duration}s`,
		animationIterationCount: "infinite" as const,
		animationName: {
			from: {
				transform: [{ translateX: d.from.x }, { translateY: d.from.y }],
			},
			to: { transform: [{ translateX: d.to.x }, { translateY: d.to.y }] },
		},
		animationTimingFunction: d.easing,
	};
}

// ---- Puffy clouds (round 7 `.sk .cl1 .cl2 .p .pr .pl .pt`) ----

const BAND_TILES = 3; // round 7 band is 1332 px wide = 2.3 tiles; 3 covers it and any phone width

interface BandLayer {
	bottom: number;
	delay: number;
	duration: number;
	height: number;
	opacity: number;
	sprite: number;
	tileWidth: number;
}

const bandFront: BandLayer = {
	bottom: pt(-6), // .cl1 bottom
	delay: -18, // .cl1 --d
	duration: 70, // .cl1 --t
	height: pt(104),
	opacity: 0.85, // .cl1 opacity .85
	sprite: bandFrontSprite,
	tileWidth: pt(587),
};
const bandBack: BandLayer = {
	bottom: pt(42), // .cl2 bottom
	delay: -60, // .cl2 --d
	duration: 112, // .cl2 --t
	height: pt(90),
	opacity: 0.45, // .cl2 opacity .45
	sprite: bandBackSprite,
	tileWidth: pt(509),
};

interface Puff {
	alternate: boolean;
	delay: number;
	duration: number;
	dx: number; // horizontal travel as a fraction of the round 7 screen width
	easing: Easing;
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

function Band({
	calm,
	layer,
	pose,
}: {
	calm: boolean;
	layer: BandLayer;
	pose: Drift;
}) {
	const tiles = Array.from({ length: BAND_TILES }, (_, i) => i);
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.band,
				{
					bottom: layer.bottom,
					height: layer.height,
					opacity: layer.opacity,
					width: layer.tileWidth * BAND_TILES,
				},
				driftStyle(pose, calm),
			]}
		>
			{tiles.map((i) => (
				<Image
					contentFit="fill"
					key={i}
					source={layer.sprite}
					style={{ height: layer.height, width: layer.tileWidth }}
				/>
			))}
		</Animated.View>
	);
}

// The band sprite is still opaque along its bottom row, so the back layer would end in a hard line
// 42 pt above the screen bottom. Instead of clipping the sprite, paint the sky's own colour back
// over its lower BAND_FADE pt, solid at the edge, so the layer dissolves into the sky.
const BAND_FADE = pt(36);
const BAND_FADE_OVERLAP = 2; // also cover the pt under the edge so no antialiased row survives

function skyRgb(
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

function BandFade({
	height,
	palette,
}: {
	height: number;
	palette: SkyPalette;
}) {
	const { colors: stops, locations } = skyPalettes[palette];
	const edge = skyRgb(stops, locations, 1 - bandBack.bottom / height);
	const top = skyRgb(
		stops,
		locations,
		1 - (bandBack.bottom + BAND_FADE) / height
	);
	const total = BAND_FADE + BAND_FADE_OVERLAP;
	return (
		<LinearGradient
			colors={[`rgba(${top},0)`, `rgba(${edge},1)`, `rgba(${edge},1)`]}
			locations={[0, BAND_FADE / total, 1]}
			pointerEvents="none"
			style={[
				styles.abs,
				{
					bottom: bandBack.bottom - BAND_FADE_OVERLAP,
					height: total,
					left: 0,
					right: 0,
				},
			]}
		/>
	);
}

function bandDrift(layer: BandLayer): Drift {
	return {
		alternate: false,
		delay: layer.delay,
		duration: layer.duration,
		easing: "linear",
		from: { x: 0, y: 0 },
		to: { x: -layer.tileWidth, y: 0 }, // one tile per loop = seamless wrap
	};
}

function PuffCloud({
	calm,
	puff,
	width,
}: {
	calm: boolean;
	puff: Puff;
	width: number;
}) {
	// pdrift: from (0, -6 px) to (dx, +8 px); ptop: straight across.
	const k = width / DRAW_WIDTH;
	const vertical = puff.alternate;
	const pose: Drift = {
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
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.abs,
				puff.horizontal,
				{
					height: puff.height,
					opacity: puff.opacity,
					top: puff.top,
					width: puff.width,
				},
				driftStyle(pose, calm),
			]}
		>
			<Image
				contentFit="contain"
				source={puff.image}
				style={StyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
}

// ---- Night and Twilight wisps (round 7 `.sk .w`) ----

const wispTint: Record<"night" | "twilight", string> = {
	night: "190,212,255",
	twilight: "214,230,255",
};
const wisps = [
	{ delay: -14, duration: 58, height: pt(92), top: "9%" },
	{ delay: -40, duration: 76, height: pt(120), top: "38%" },
	{ delay: -5, duration: 66, height: pt(100), top: "64%" },
] as const;

function Wisps({
	calm,
	palette,
	width,
}: {
	calm: boolean;
	palette: "night" | "twilight";
	width: number;
}) {
	const tint = wispTint[palette];
	const wispWidth = width * 1.7; // width: 170%
	const travel = wispWidth * 0.14; // translateX -14% to 14%
	const gradientId = `wisp-${palette}`;
	return (
		<>
			{wisps.map((w) => (
				<Animated.View
					key={w.top}
					pointerEvents="none"
					style={[
						styles.abs,
						{
							height: w.height,
							left: width * -0.35, // left: -35%
							top: w.top,
							width: wispWidth,
						},
						driftStyle(
							{
								alternate: true,
								delay: w.delay,
								duration: w.duration,
								easing: "ease-in-out",
								from: { x: -travel, y: 0 },
								to: { x: travel, y: 0 },
							},
							calm
						),
					]}
				>
					<Svg
						height="100%"
						preserveAspectRatio="none"
						viewBox="0 0 100 100"
						width="100%"
					>
						<Defs>
							<RadialGradient cx="50%" cy="50%" id={gradientId} r="50%">
								<Stop offset="0" stopColor={`rgb(${tint})`} stopOpacity={0.2} />
								<Stop
									offset="0.62"
									stopColor={`rgb(${tint})`}
									stopOpacity={0.08}
								/>
								<Stop offset="1" stopColor={`rgb(${tint})`} stopOpacity={0} />
							</RadialGradient>
						</Defs>
						<Ellipse
							cx={50}
							cy={50}
							fill={`url(#${gradientId})`}
							rx={50}
							ry={50}
						/>
					</Svg>
				</Animated.View>
			))}
		</>
	);
}

// ---- Stars (round 7 `.sk .s` and its `tw` twinkle): generated once, so nothing reshuffles ----

const STAR_COUNT = 34;
const STAR_SEED = 13; // round 7 uses rng(n * 97 + 13) for its first sky

const stars = (() => {
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

const twinkle = {
	"0%": { opacity: 0.1, transform: [{ scale: 0.6 }] },
	"50%": { opacity: 1, transform: [{ scale: 1.15 }] },
	"100%": { opacity: 0.1, transform: [{ scale: 0.6 }] },
};

function Stars({ calm }: { calm: boolean }) {
	return (
		<>
			{stars.map((s) => (
				<Animated.View
					key={s.id}
					pointerEvents="none"
					style={[
						styles.abs,
						{
							backgroundColor: colors.star,
							borderRadius: s.size / 2,
							boxShadow: `0px 0px ${s.size * 2.5}px rgba(255,255,255,0.75)`,
							height: s.size,
							left: s.left,
							opacity: 0.75,
							top: s.top,
							width: s.size,
						},
						calm
							? null
							: {
									animationDelay: `${s.delay}s`,
									animationDuration: `${s.duration}s`,
									animationIterationCount: "infinite",
									animationName: twinkle,
									animationTimingFunction: "ease-in-out",
								},
					]}
				/>
			))}
		</>
	);
}

// ---- Sky ----

export function Sky({ palette = "puffy" }: { palette?: SkyPalette }) {
	const calm = useCalm();
	const [size, setSize] = useState({ height: 0, width: 0 });
	const { height, width } = size;
	const { colors: stops, locations } = skyPalettes[palette];

	const onLayout = (e: LayoutChangeEvent) => {
		const { height: h, width: w } = e.nativeEvent.layout;
		setSize({ height: h, width: w });
	};

	return (
		<View
			onLayout={onLayout}
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, styles.clip]}
		>
			<LinearGradient
				colors={[...stops]}
				locations={[...locations]}
				style={StyleSheet.absoluteFill}
			/>
			{width > 0 && palette !== "puffy" ? (
				<Wisps calm={calm} palette={palette} width={width} />
			) : null}
			{width > 0 && palette === "puffy" ? (
				<>
					<PuffCloud calm={calm} puff={puffTop} width={width} />
					<PuffCloud calm={calm} puff={puffRight} width={width} />
					<PuffCloud calm={calm} puff={puffLeft} width={width} />
					<Band calm={calm} layer={bandBack} pose={bandDrift(bandBack)} />
					<BandFade height={height} palette={palette} />
					<Band calm={calm} layer={bandFront} pose={bandDrift(bandFront)} />
				</>
			) : null}
			<Stars calm={calm} />
		</View>
	);
}

const styles = StyleSheet.create({
	abs: { position: "absolute" },
	band: { flexDirection: "row", left: 0, position: "absolute" },
	clip: { overflow: "hidden" },
});
