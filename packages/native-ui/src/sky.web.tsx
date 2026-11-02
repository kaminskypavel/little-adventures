import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useCalm } from "./motion-provider";
import {
	BAND_FADE,
	BAND_FADE_OVERLAP,
	BAND_TILES,
	type BandLayer,
	bandBack,
	bandDrift,
	bandFront,
	type Drift,
	type Puff,
	puffDrift,
	puffs,
	STAR_CALM_OPACITY,
	STAR_GLOW,
	STAR_GLOW_BLUR,
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

// The web sky: views with Reanimated CSS animations, which the browser runs as CSS animations.
// iOS and Android draw the same scene on one Skia canvas (`sky.tsx`).

/**
 * One looping drift. Moving: a CSS animation. Calm: the same pose the loop would be at when the
 * screen opens, still.
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

function Band({ calm, layer }: { calm: boolean; layer: BandLayer }) {
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
				driftStyle(bandDrift(layer), calm),
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

function PuffCloud({
	calm,
	puff,
	width,
}: {
	calm: boolean;
	puff: Puff;
	width: number;
}) {
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
				driftStyle(puffDrift(puff, width), calm),
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
	const wispWidth = width * WISP_WIDTH;
	const travel = wispWidth * WISP_TRAVEL;
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
							left: width * WISP_LEFT,
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
								{wispStops.map((s) => (
									<Stop
										key={s.at}
										offset={s.at}
										stopColor={`rgb(${tint})`}
										stopOpacity={s.opacity}
									/>
								))}
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

const twinkle = {
	"0%": {
		opacity: twinkleFrom.opacity,
		transform: [{ scale: twinkleFrom.scale }],
	},
	"50%": {
		opacity: twinkleTo.opacity,
		transform: [{ scale: twinkleTo.scale }],
	},
	"100%": {
		opacity: twinkleFrom.opacity,
		transform: [{ scale: twinkleFrom.scale }],
	},
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
							boxShadow: `0px 0px ${s.size * STAR_GLOW_BLUR}px ${STAR_GLOW}`,
							height: s.size,
							left: s.left,
							opacity: STAR_CALM_OPACITY,
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
					{puffs.map((p) => (
						<PuffCloud calm={calm} key={p.top} puff={p} width={width} />
					))}
					<Band calm={calm} layer={bandBack} />
					<BandFade height={height} palette={palette} />
					<Band calm={calm} layer={bandFront} />
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
