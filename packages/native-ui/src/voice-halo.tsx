import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	cubicBezier,
	Easing,
	interpolate,
	type SharedValue,
	useAnimatedProps,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { ClaySurface } from "./clay-surface";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { colors, motion } from "./tokens";

export type VoiceHaloState = "missed" | "ready" | "recording" | "thinking";

// Round 2 item 16A, measured on the 390 pt design.
const BUTTON = 176;
const HALF = BUTTON / 2;
const ICON = 72;
const GROW = 44;
const RIPPLE = 9;
const LEVEL_EASE_MS = 120;
const RIPPLE_MS = motion.walk;
// The drawing box holds the widest layer: button, full growth and full ripple.
const SIZE = BUTTON + 2 * (GROW + RIPPLE);
const CENTER = SIZE / 2;
const POINTS = 64;
const BUBBLE_RISE = 160;
const BUBBLE_EVERY = 500;
// Four bubbles in a loop keep one rising every 500 ms (1600 ms of rise plus a 400 ms rest).
const BUBBLE_LOOP = BUBBLE_EVERY * 4;
const KEEP_HOLDING = { bottom: 400, left: 400, right: 400, top: 400 } as const;

const easeOut = Easing.bezier(...motion.easeOut);
const ringEase = cubicBezier(...motion.easeOut);

// Three layers at 10, 16 and 22% sun. Each grows by its share of GROW; lobes (bumps around the
// edge), travel direction, speed and phase keep the three edges out of step.
const layers = [
	{ alpha: 0.1, dir: 1, lobes: 3, phase: 0, reach: 1, turns: 1 },
	{ alpha: 0.16, dir: -1, lobes: 4, phase: 2.1, reach: 0.7, turns: 1 },
	{ alpha: 0.22, dir: 1, lobes: 5, phase: 4.2, reach: 0.4, turns: 2 },
] as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const rings = [
	{ alpha: 0.26, size: 214, width: 3 },
	{ alpha: 0.12, size: 252, width: 2 },
] as const;
const MISSED_RING = { alpha: 0.42, size: 214, width: 4 } as const;
// Reduced motion: one still ring, three sizes.
const CALM_REACH = [14, 29, GROW] as const;
const CALM_STEPS = CALM_REACH.length;

const sun = (alpha: number) => `rgba(255,200,61,${alpha})`;

const bubbles = [
	{ size: 18, x: -16 },
	{ size: 11, x: 15 },
	{ size: 24, x: 0 },
	{ size: 14, x: -6 },
] as const;

const rise = {
	"0%": { opacity: 0, transform: [{ translateY: 0 }] },
	"12%": { opacity: 0.85, transform: [{ translateY: -BUBBLE_RISE * 0.1 }] },
	"80%": { opacity: 0, transform: [{ translateY: -BUBBLE_RISE }] },
	"100%": { opacity: 0, transform: [{ translateY: -BUBBLE_RISE }] },
};

const pulse = {
	"0%": { transform: [{ scale: 1 }] },
	"50%": { transform: [{ scale: motion.pulsePeak }] },
	"100%": { transform: [{ scale: 1 }] },
};

function HaloLayer({
	grow,
	layer,
	open,
	t,
}: {
	grow: SharedValue<number>;
	layer: (typeof layers)[number];
	open: SharedValue<number>;
	t: SharedValue<number>;
}) {
	const animatedProps = useAnimatedProps(() => {
		const g = grow.get() * open.get();
		const radius = HALF + g * GROW * layer.reach;
		// No voice, no ripple: the edge only moves once there is a level.
		const ripple = RIPPLE * Math.min(1, g * 2);
		const shift = 2 * Math.PI * layer.dir * layer.turns * t.get() + layer.phase;
		let d = "";
		for (let i = 0; i < POINTS; i += 1) {
			const theta = (2 * Math.PI * i) / POINTS;
			// Two soft bump patterns travelling opposite ways round the edge, peak 1.
			const wave =
				0.7 * Math.sin(layer.lobes * theta + shift) +
				0.3 * Math.sin((layer.lobes + 2) * theta - 2 * shift);
			const r = radius + ripple * wave;
			d += `${i === 0 ? "M" : "L"}${CENTER + r * Math.cos(theta)} ${CENTER + r * Math.sin(theta)} `;
		}
		return { d: `${d}Z`, fillOpacity: g < 0.01 ? 0 : layer.alpha };
	});
	return (
		<Svg
			height={SIZE}
			style={styles.layer}
			viewBox={`0 0 ${SIZE} ${SIZE}`}
			width={SIZE}
		>
			<AnimatedPath animatedProps={animatedProps} fill={colors.sun} />
		</Svg>
	);
}

function Bubble({
	index,
	size,
	x,
}: {
	index: number;
	size: number;
	x: number;
}) {
	return (
		<Animated.View
			style={[
				styles.bubble,
				{
					animationDelay: `${index * BUBBLE_EVERY}ms`,
					animationDuration: `${BUBBLE_LOOP}ms`,
					animationIterationCount: "infinite",
					animationName: rise,
					animationTimingFunction: "ease-out",
					borderRadius: size / 2,
					height: size,
					left: HALF + x - size / 2,
					top: -size / 2,
					width: size,
				},
			]}
		/>
	);
}

/**
 * A still ring around the button. It comes in growing out from the button's edge as it fades in
 * (`order` staggers the rings, inner first) and leaves with a quick fade.
 */
function Ring({
	alpha,
	motionStyle,
	order = 0,
	shown,
	size,
	width,
}: {
	alpha: number;
	motionStyle?: object | null;
	order?: number;
	shown: boolean;
	size: number;
	width: number;
}) {
	const calm = useCalm();
	const enter = !calm && shown;
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					borderColor: sun(alpha),
					borderRadius: size / 2,
					borderWidth: width,
					height: size,
					left: (BUTTON - size) / 2,
					opacity: shown ? 1 : 0,
					position: "absolute",
					top: (BUTTON - size) / 2,
					transform: [{ scale: shown || calm ? 1 : BUTTON / size }],
					transitionDelay: enter ? `${order * motion.enterStagger}ms` : "0ms",
					transitionDuration: calm
						? "0ms"
						: `${shown ? motion.enter : motion.release}ms`,
					transitionProperty: ["opacity", "transform"],
					transitionTimingFunction: ringEase,
					width: size,
				},
				motionStyle,
			]}
		/>
	);
}

/**
 * Item 16A: the hold-to-talk button with its voice halo. `level` is 0..1 and is read while the
 * state is "recording". Recording: three halo layers grow and ripple with the level. Thinking:
 * the halo shrinks into the button, the button goes flat and sun bubbles rise. Ready and missed
 * show still rings (missed pulses once). Reduced motion: one still ring in three sizes.
 */
export function VoiceHalo({
	landed = true,
	level,
	onHoldEnd,
	onHoldStart,
	state,
}: {
	/** False while the button is still arriving (Home's morph): the rings wait for it. */
	landed?: boolean;
	level: number;
	onHoldEnd: () => void;
	onHoldStart: () => void;
	state: VoiceHaloState;
}) {
	const calm = useCalm();
	const recording = state === "recording";
	const thinking = state === "thinking";
	const grow = useSharedValue(0);
	const open = useSharedValue(0);
	const t = useSharedValue(0);
	const pressed = useSharedValue(0);

	useEffect(() => {
		pressed.set(withTiming(recording ? 1 : 0, { duration: motion.press }));
		if (recording) {
			grow.set(0);
			open.set(1);
		} else {
			open.set(withTiming(0, { duration: motion.release, easing: easeOut }));
		}
	}, [grow, open, pressed, recording]);

	useEffect(() => {
		if (recording) {
			grow.set(
				withTiming(level, { duration: LEVEL_EASE_MS, easing: Easing.linear })
			);
		}
	}, [grow, level, recording]);

	useEffect(() => {
		if (recording && !calm) {
			t.set(0);
			t.set(
				withRepeat(
					withTiming(1, { duration: RIPPLE_MS, easing: Easing.linear }),
					-1
				)
			);
		} else {
			cancelAnimation(t);
		}
	}, [calm, recording, t]);

	const press = useAnimatedStyle(() => ({
		transform: [
			{ scale: interpolate(pressed.get(), [0, 1], [1, motion.pressScale]) },
			{ translateY: pressed.get() * motion.pressTranslate },
		],
	}));

	const step = Math.min(CALM_STEPS - 1, Math.floor(level * CALM_STEPS));
	const calmSize = BUTTON + 2 * (CALM_REACH[step] ?? GROW);

	return (
		<View style={styles.box}>
			{calm ? (
				<Ring
					alpha={0.6}
					shown={recording}
					size={calmSize}
					width={MISSED_RING.width}
				/>
			) : (
				<View pointerEvents="none" style={styles.fill}>
					{layers.map((layer) => (
						<HaloLayer
							grow={grow}
							key={layer.alpha}
							layer={layer}
							open={open}
							t={t}
						/>
					))}
				</View>
			)}
			<Ring {...rings[0]} order={0} shown={landed && state === "ready"} />
			<Ring {...rings[1]} order={1} shown={landed && state === "ready"} />
			<Ring
				{...MISSED_RING}
				motionStyle={
					state === "missed" && !calm
						? {
								animationDuration: `${motion.pulse}ms`,
								animationIterationCount: 1,
								animationName: pulse,
								animationTimingFunction: "ease-in-out",
							}
						: null
				}
				shown={state === "missed"}
			/>
			<Animated.View style={[styles.fill, press]}>
				<Pressable
					accessibilityHint="Press and hold, ask your question, then let go"
					accessibilityLabel="Hold to ask"
					accessibilityRole="button"
					disabled={thinking}
					onPressIn={onHoldStart}
					onPressOut={onHoldEnd}
					pressRetentionOffset={KEEP_HOLDING}
					style={styles.button}
				>
					<ClaySurface
						pressed={pressed}
						radius={HALF}
						style={StyleSheet.absoluteFill}
						tone="sun"
					/>
					<Icon color={colors.inkNavy} name="mic" size={ICON} />
					<Animated.View
						pointerEvents="none"
						style={[
							styles.flat,
							{
								opacity: thinking ? 1 : 0,
								transitionDuration: calm ? "0ms" : `${motion.exit}ms`,
								transitionProperty: "opacity",
								transitionTimingFunction: "ease-out",
							},
						]}
					>
						<Icon color="rgba(244,236,216,0.35)" name="mic" size={ICON} />
					</Animated.View>
				</Pressable>
			</Animated.View>
			{thinking && !calm ? (
				<View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={styles.fill}
				>
					{bubbles.map((bubble, index) => (
						<Bubble
							index={index}
							key={bubble.size}
							size={bubble.size}
							x={bubble.x}
						/>
					))}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	box: { alignSelf: "center", height: BUTTON, width: BUTTON },
	bubble: { backgroundColor: colors.sun, opacity: 0, position: "absolute" },
	button: {
		alignItems: "center",
		borderRadius: HALF,
		height: BUTTON,
		justifyContent: "center",
		width: BUTTON,
	},
	fill: {
		height: BUTTON,
		left: 0,
		position: "absolute",
		top: 0,
		width: BUTTON,
	},
	flat: {
		alignItems: "center",
		backgroundColor: colors.inkNavy,
		borderColor: "rgba(244,236,216,0.1)",
		borderRadius: HALF,
		borderWidth: 3,
		bottom: 0,
		justifyContent: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	layer: {
		left: (BUTTON - SIZE) / 2,
		position: "absolute",
		top: (BUTTON - SIZE) / 2,
	},
});
