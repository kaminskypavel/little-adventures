import {
	BlurMask,
	Canvas,
	Circle,
	FilterMode,
	Group,
	Image,
	ImageShader,
	LinearGradient,
	MipmapMode,
	RadialGradient,
	Rect,
	rect,
	type Transforms3d,
	useImage,
	vec,
} from "@shopify/react-native-skia";
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
	type SharedValue,
	useDerivedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import {
	BAND_FADE,
	BAND_FADE_OVERLAP,
	type BandLayer,
	bandBack,
	bandDrift,
	bandFront,
	type Drift,
	type Puff,
	percentOf,
	puffDrift,
	puffs,
	STAR_CALM_OPACITY,
	STAR_GLOW,
	STAR_GLOW_BLUR,
	type Star,
	skyRgb,
	stars,
	twinkleFrom,
	twinkleTo,
	WISP_LEFT,
	WISP_TRAVEL,
	WISP_WIDTH,
	wispStops,
	wisps,
	wispTint,
} from "./sky-scene";
import { colors, type SkyPalette, skyPalettes } from "./tokens";

// The sky on iOS and Android: one opaque Skia canvas, drawn on the UI thread (the web keeps its
// views, `sky.web.tsx`). As views, one per cloud band, puff and star, each on a looping animation,
// the sky was most of the phone's heat: every frame Reanimated committed some 40 animated views
// and the compositor moved as many layers. Here the scene is a single layer, and its slow motion
// steps 30 times a second instead of 60. Calm (reduced motion): the clock never starts, so the
// scene holds the pose it opens on.

const STEP = 1 / 30; // seconds between redraws; drifts and twinkles read the same as at 60
const SMOOTH = { filter: FilterMode.Linear, mipmap: MipmapMode.None };

/** CSS `ease-in-out`, near enough for slow loops: half a cosine. */
function easeInOut(p: number) {
	"worklet";
	return 0.5 - 0.5 * Math.cos(Math.PI * p);
}

/** Where a looping drift is `t` seconds after the screen opened (a negative delay = under way). */
function driftAt(d: Drift, t: number): Transforms3d {
	"worklet";
	let p = ((t - d.delay) / d.duration) % (d.alternate ? 2 : 1);
	if (p > 1) {
		p = 2 - p;
	}
	const k = d.easing === "linear" ? p : easeInOut(p);
	return [
		{ translateX: d.from.x + (d.to.x - d.from.x) * k },
		{ translateY: d.from.y + (d.to.y - d.from.y) * k },
	];
}

/** The twinkle, 0 (dim, small) to 1 (bright, a little big) and back once per cycle. */
function twinkleAt(s: Star, t: number) {
	"worklet";
	const p = ((t - s.delay) / s.duration) % 1;
	return easeInOut(p < 0.5 ? p * 2 : 2 - p * 2);
}

/**
 * Seconds since the sky opened, advanced in STEP increments on the UI thread. Counted from the
 * first frame's timestamp, kept in a shared value: a re-render registers the frame callback again,
 * and the callback's own `timeSinceFirstFrame` would restart at 0 and stall the sky.
 */
function useSkyClock(moving: boolean) {
	const clock = useSharedValue(0);
	const origin = useSharedValue(-1);
	useFrameCallback(({ timestamp }) => {
		if (origin.get() < 0) {
			origin.set(timestamp);
		}
		const t = (timestamp - origin.get()) / 1000;
		if (t - clock.get() >= STEP) {
			clock.set(t);
		}
	}, moving);
	return clock;
}

type Clock = SharedValue<number>;

function Band({
	clock,
	height,
	layer,
	width,
}: {
	clock: Clock;
	height: number;
	layer: BandLayer;
	width: number;
}) {
	const image = useImage(layer.sprite);
	const drift = bandDrift(layer);
	const transform = useDerivedValue(() => driftAt(drift, clock.get()));
	const y = height - layer.bottom - layer.height;
	if (!image) {
		return null;
	}
	// One repeating shader: the band slides one tile per loop, so it wraps with no visible join.
	return (
		<Group opacity={layer.opacity} transform={transform}>
			<Rect height={layer.height} width={width + layer.tileWidth} x={0} y={y}>
				<ImageShader
					fit="fill"
					image={image}
					rect={rect(0, y, layer.tileWidth, layer.height)}
					sampling={SMOOTH}
					tx="repeat"
					ty="clamp"
				/>
			</Rect>
		</Group>
	);
}

function BandFade({
	height,
	palette,
	width,
}: {
	height: number;
	palette: SkyPalette;
	width: number;
}) {
	const { colors: stops, locations } = skyPalettes[palette];
	const edge = skyRgb(stops, locations, 1 - bandBack.bottom / height);
	const top = skyRgb(
		stops,
		locations,
		1 - (bandBack.bottom + BAND_FADE) / height
	);
	const total = BAND_FADE + BAND_FADE_OVERLAP;
	const y = height - (bandBack.bottom - BAND_FADE_OVERLAP) - total;
	return (
		<Rect height={total} width={width} x={0} y={y}>
			<LinearGradient
				colors={[`rgba(${top},0)`, `rgba(${edge},1)`, `rgba(${edge},1)`]}
				end={vec(0, y + total)}
				positions={[0, BAND_FADE / total, 1]}
				start={vec(0, y)}
			/>
		</Rect>
	);
}

function PuffCloud({
	clock,
	height,
	puff,
	width,
}: {
	clock: Clock;
	height: number;
	puff: Puff;
	width: number;
}) {
	const image = useImage(puff.image);
	const drift = puffDrift(puff, width);
	const transform = useDerivedValue(() => driftAt(drift, clock.get()));
	const x =
		"left" in puff.horizontal
			? puff.horizontal.left
			: width - puff.horizontal.right - puff.width;
	return (
		<Group opacity={puff.opacity} transform={transform}>
			<Image
				fit="contain"
				height={puff.height}
				image={image}
				sampling={SMOOTH}
				width={puff.width}
				x={x}
				y={percentOf(puff.top, height)}
			/>
		</Group>
	);
}

function Wisp({
	clock,
	height,
	tint,
	width,
	wisp,
}: {
	clock: Clock;
	height: number;
	tint: string;
	width: number;
	wisp: (typeof wisps)[number];
}) {
	const wide = width * WISP_WIDTH;
	const travel = wide * WISP_TRAVEL;
	const drift: Drift = {
		alternate: true,
		delay: wisp.delay,
		duration: wisp.duration,
		easing: "ease-in-out",
		from: { x: -travel, y: 0 },
		to: { x: travel, y: 0 },
	};
	const transform = useDerivedValue(() => driftAt(drift, clock.get()));
	const r = wide / 2;
	// A round gradient squashed to the wisp's height, like the SVG ellipse stretched to its box.
	return (
		<Group transform={transform}>
			<Group
				transform={[
					{ translateX: width * WISP_LEFT },
					{ translateY: percentOf(wisp.top, height) },
					{ scaleY: wisp.height / wide },
				]}
			>
				<Circle c={vec(r, r)} r={r}>
					<RadialGradient
						c={vec(r, r)}
						colors={wispStops.map((s) => `rgba(${tint},${s.opacity})`)}
						positions={wispStops.map((s) => s.at)}
						r={r}
					/>
				</Circle>
			</Group>
		</Group>
	);
}

function StarDot({
	calm,
	clock,
	height,
	star,
	width,
}: {
	calm: boolean;
	clock: Clock;
	height: number;
	star: Star;
	width: number;
}) {
	const radius = star.size / 2;
	const c = vec(
		percentOf(star.left, width) + radius,
		percentOf(star.top, height) + radius
	);
	const opacity = useDerivedValue(() => {
		if (calm) {
			return STAR_CALM_OPACITY;
		}
		const k = twinkleAt(star, clock.get());
		return twinkleFrom.opacity + (twinkleTo.opacity - twinkleFrom.opacity) * k;
	});
	const transform = useDerivedValue(() => {
		const k = calm ? 1 : twinkleAt(star, clock.get());
		const scale = calm
			? 1
			: twinkleFrom.scale + (twinkleTo.scale - twinkleFrom.scale) * k;
		return [{ scale }];
	});
	// The glow is the dot blurred: a CSS box-shadow blur of B is a Gaussian of sigma B / 2.
	return (
		<Group opacity={opacity} origin={c} transform={transform}>
			<Circle c={c} color={STAR_GLOW} r={radius}>
				<BlurMask blur={(star.size * STAR_GLOW_BLUR) / 2} style="normal" />
			</Circle>
			<Circle c={c} color={colors.star} r={radius} />
		</Group>
	);
}

function SkyScene({
	calm,
	height,
	palette,
	width,
}: {
	calm: boolean;
	height: number;
	palette: SkyPalette;
	width: number;
}) {
	const clock = useSkyClock(!calm);
	const { colors: stops, locations } = skyPalettes[palette];
	return (
		<Canvas opaque style={StyleSheet.absoluteFill}>
			<Rect height={height} width={width} x={0} y={0}>
				<LinearGradient
					colors={[...stops]}
					end={vec(0, height)}
					positions={[...locations]}
					start={vec(0, 0)}
				/>
			</Rect>
			{palette === "puffy" ? (
				<>
					{puffs.map((p) => (
						<PuffCloud
							clock={clock}
							height={height}
							key={p.top}
							puff={p}
							width={width}
						/>
					))}
					<Band clock={clock} height={height} layer={bandBack} width={width} />
					<BandFade height={height} palette={palette} width={width} />
					<Band clock={clock} height={height} layer={bandFront} width={width} />
				</>
			) : (
				wisps.map((w) => (
					<Wisp
						clock={clock}
						height={height}
						key={w.top}
						tint={wispTint[palette]}
						width={width}
						wisp={w}
					/>
				))
			)}
			{stars.map((s) => (
				<StarDot
					calm={calm}
					clock={clock}
					height={height}
					key={s.id}
					star={s}
					width={width}
				/>
			))}
		</Canvas>
	);
}

export function Sky({ palette = "puffy" }: { palette?: SkyPalette }) {
	const calm = useCalm();
	const [size, setSize] = useState({ height: 0, width: 0 });
	const { colors: stops } = skyPalettes[palette];

	const onLayout = (e: LayoutChangeEvent) => {
		const { height, width } = e.nativeEvent.layout;
		setSize({ height, width });
	};

	return (
		<View
			onLayout={onLayout}
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, { backgroundColor: stops[0] }]}
		>
			{size.width > 0 ? (
				// Keyed on calm: the frame clock only reads whether it runs when it mounts.
				<SkyScene
					calm={calm}
					height={size.height}
					key={calm ? "calm" : "moving"}
					palette={palette}
					width={size.width}
				/>
			) : null}
		</View>
	);
}
