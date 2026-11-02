import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import {
	type ClayTone,
	clayFaces,
	clayShadow,
	colors,
	motion,
	reducedPressDarken,
} from "./tokens";

/** One radius for every corner, or the top pair and the bottom pair apart (an arch). */
export type ClayRadius = number | { bottom: number; top: number };

/** The border radius style for a `ClayRadius`. */
export function cornerStyle(radius: ClayRadius): ViewStyle {
	if (typeof radius === "number") {
		return { borderRadius: radius };
	}
	return {
		borderBottomLeftRadius: radius.bottom,
		borderBottomRightRadius: radius.bottom,
		borderTopLeftRadius: radius.top,
		borderTopRightRadius: radius.top,
	};
}

interface ClaySurfaceProps {
	children?: ReactNode;
	/**
	 * 0 keeps the shadows, 1 drops them: no shadow layers at all. For a surface that resizes every
	 * frame (the New adventure pill turning into the mic), where iOS would rebuild and re-mask
	 * every shadow on every frame.
	 */
	flatten?: SharedValue<number>;
	/** 0 at rest, 1 while the finger is down. May overshoot below 0 on release. */
	pressed?: SharedValue<number>;
	radius: ClayRadius;
	/** Cross-fades to the sun face. */
	selected?: boolean;
	style?: StyleProp<ViewStyle>;
	tone: ClayTone;
}

const { down, rest } = clayShadow;
const clamp = Extrapolation.CLAMP;

/**
 * The clay piece: gradient face, a lip and top highlight (inset), and a soft ground shadow.
 * Layers, bottom to top: face, selected face, reduced-press darken, shadow layer, children.
 * The shadow layer sits above the faces because an inset shadow paints under a child.
 */
export function ClaySurface({
	children,
	flatten,
	pressed,
	radius,
	selected,
	style,
	tone,
}: ClaySurfaceProps) {
	const calm = useCalm();
	const resting = useSharedValue(0);
	const press = pressed ?? resting;

	const shadow = useAnimatedStyle(() => {
		const t = press.get();
		const flat = flatten ? flatten.get() : 0;
		if (flat >= 1) {
			return { boxShadow: [] };
		}
		const mix = (a: number, b: number) =>
			interpolate(t, [0, 1], [a, b], clamp) * (1 - flat);
		return {
			boxShadow: [
				{
					blurRadius: 3,
					color: `rgba(255,255,255,${mix(rest.highlight, down.highlight)})`,
					inset: true,
					offsetX: 0,
					offsetY: mix(rest.highlightY, down.highlightY),
					spreadDistance: 0,
				},
				{
					blurRadius: 0,
					color: `rgba(0,0,0,${mix(rest.lipAlpha, down.lipAlpha)})`,
					inset: true,
					offsetX: 0,
					offsetY: -mix(rest.lip, down.lip),
					spreadDistance: 0,
				},
				{
					blurRadius: mix(rest.dropBlur, down.dropBlur),
					color: `rgba(0,0,0,${mix(rest.dropAlpha, down.dropAlpha)})`,
					offsetX: 0,
					offsetY: mix(rest.dropY, down.dropY),
					spreadDistance: mix(rest.dropSpread, down.dropSpread),
				},
			],
		};
	});

	const darken = useAnimatedStyle(() => ({
		opacity: calm
			? interpolate(press.get(), [0, 1], [0, reducedPressDarken], clamp)
			: 0,
	}));

	const corners = cornerStyle(radius);
	const fill = [StyleSheet.absoluteFill, corners];
	const showSun = tone !== "sun" && tone !== "sunReady";

	return (
		<View style={[corners, style]}>
			<View pointerEvents="none" style={[fill, styles.clip]}>
				<LinearGradient
					colors={clayFaces[tone]}
					style={StyleSheet.absoluteFill}
				/>
				{showSun ? (
					<Animated.View
						style={[
							StyleSheet.absoluteFill,
							{
								opacity: selected ? 1 : 0,
								transitionDuration: calm ? "0ms" : `${motion.select}ms`,
								transitionProperty: "opacity",
								transitionTimingFunction: "ease-in-out",
							},
						]}
					>
						<LinearGradient
							colors={clayFaces.sun}
							style={StyleSheet.absoluteFill}
						/>
					</Animated.View>
				) : null}
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: colors.inkNavy },
						darken,
					]}
				/>
			</View>
			{/* iOS draws these shadows once and reuses them (redrawn only while pressed): live,
			    they cost the GPU offscreen passes on every frame. */}
			<Animated.View
				pointerEvents="none"
				shouldRasterizeIOS
				style={[fill, shadow]}
			/>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	clip: { overflow: "hidden" },
});
