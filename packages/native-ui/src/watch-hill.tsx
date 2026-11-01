import { Image } from "expo-image";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { Character } from "./character";
import { useCalm } from "./motion-provider";
import { Placeholder } from "./placeholder";
import { colors, iconSizes, motion } from "./tokens";

// Round 7 `.noawatch`, `.nw` and `.hill` at 0.72 scale (px / 0.72). The child's picture stands on
// a clay hill at the bottom left: their drawn look, or the neutral round placeholder without one.
const hill = {
	bottom: -86,
	height: 208,
	left: -64,
	// Round 7: `radial-gradient(ellipse at 38% 22%, ...)`, farthest corner. In a 125.8 x 100 view
	// box stretched over the hill, a circle of radius 110.3 around (47.8, 22) is that ellipse.
	view: { cx: 47.8, cy: 22, height: 100, r: 110.3, width: 125.8 },
	width: 347,
} as const;

const shadow = [
	{
		blurRadius: 8,
		color: "rgba(255,255,255,0.3)",
		inset: true,
		offsetX: 0,
		offsetY: 8,
		spreadDistance: 0,
	},
	{
		blurRadius: 14,
		color: "rgba(0,0,0,0.18)",
		inset: true,
		offsetX: 0,
		offsetY: -11,
		spreadDistance: 0,
	},
	{
		blurRadius: 11,
		color: "rgba(0,0,0,0.25)",
		offsetX: 0,
		offsetY: -3,
		spreadDistance: 0,
	},
];

const picture = { bottom: 117, left: 61, size: 133 } as const;
// The companion: a smaller circle in front of the child's, overlapping its right edge.
const companionCircle = { bottom: 100, left: 156, size: 104 } as const;
const PUPPY_FILL = 0.84;
const pictureFilter = "drop-shadow(0px 7px 7px rgba(0,0,0,0.4))";

// Round 7 gave the group `transition: transform .8s cubic-bezier(.2,.8,.2,1)`. Away it slides down.
const SLIDE_MS = 800;
const SLIDE_AWAY = 300;
const slideEase = cubicBezier(0.2, 0.8, 0.2, 1);

/** A round picture slot standing on the hill. */
function Circle({
	bottom,
	children,
	left,
	size,
}: {
	bottom: number;
	children: ReactNode;
	left: number;
	size: number;
}) {
	return (
		<View
			style={{
				bottom,
				filter: pictureFilter,
				height: size,
				left,
				position: "absolute",
				width: size,
			}}
		>
			{children}
		</View>
	);
}

/** A person's round picture, or the neutral round placeholder without one. */
function Face({ icon, url }: { icon: number; url: string | null }) {
	return url ? (
		<Image
			accessibilityIgnoresInvertColors
			contentFit="cover"
			source={{ uri: url }}
			style={{ borderRadius: 999, flex: 1 }}
		/>
	) : (
		<Placeholder
			icon="user"
			iconSize={icon}
			style={{ borderRadius: 999, flex: 1 }}
		/>
	);
}

/**
 * 10a: the child's picture on a clay hill at the bottom left of the wait screen, with the
 * companion (the grown-up's picture or the puppy) in a smaller circle beside it. Absolute, so
 * the parent must fill the screen. `away` slides it off the bottom (a 200 ms fade under reduced motion).
 */
export function WatchHill({
	away = false,
	companion = null,
	picture: url = null,
}: {
	away?: boolean;
	/** Who comes along: the grown-up's picture (null shows the placeholder) or the puppy. */
	companion?:
		| { kind: "grownUp"; picture: string | null }
		| { kind: "puppy" }
		| null;
	/** The child's drawn look; null shows the neutral placeholder. */
	picture?: string | null;
}) {
	const calm = useCalm();

	return (
		<Animated.View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{ bottom: 0, left: 0, position: "absolute" },
				calm
					? {
							opacity: away ? 0 : 1,
							transitionDuration: `${motion.reducedReveal}ms`,
							transitionProperty: "opacity",
						}
					: {
							transform: [{ translateY: away ? SLIDE_AWAY : 0 }],
							transitionDuration: `${SLIDE_MS}ms`,
							transitionProperty: "transform",
							transitionTimingFunction: slideEase,
						},
			]}
		>
			<Circle {...picture}>
				<Face icon={iconSizes.hero} url={url} />
			</Circle>
			{companion ? (
				<Circle {...companionCircle}>
					{companion.kind === "puppy" ? (
						<View
							style={{
								alignItems: "center",
								backgroundColor: colors.puppyDisc,
								borderRadius: companionCircle.size / 2,
								flex: 1,
								justifyContent: "center",
							}}
						>
							<Character
								kind="puppy"
								size={companionCircle.size * PUPPY_FILL}
							/>
						</View>
					) : (
						<Face icon={iconSizes.hero} url={companion.picture} />
					)}
				</Circle>
			) : null}
			<View
				style={{
					borderRadius: "50%",
					bottom: hill.bottom,
					height: hill.height,
					left: hill.left,
					position: "absolute",
					width: hill.width,
				}}
			>
				<Svg
					height="100%"
					preserveAspectRatio="none"
					viewBox={`0 0 ${hill.view.width} ${hill.view.height}`}
					width="100%"
				>
					<Defs>
						<RadialGradient
							cx={hill.view.cx}
							cy={hill.view.cy}
							gradientUnits="userSpaceOnUse"
							id="watch-hill"
							r={hill.view.r}
						>
							<Stop offset="0" stopColor={colors.hillHi} />
							<Stop offset="0.62" stopColor={colors.hillMid} />
							<Stop offset="1" stopColor={colors.hillLo} />
						</RadialGradient>
					</Defs>
					<Ellipse
						cx={hill.view.width / 2}
						cy={hill.view.height / 2}
						fill="url(#watch-hill)"
						rx={hill.view.width / 2}
						ry={hill.view.height / 2}
					/>
				</Svg>
				<View
					pointerEvents="none"
					style={{
						borderRadius: "50%",
						bottom: 0,
						boxShadow: shadow,
						left: 0,
						position: "absolute",
						right: 0,
						top: 0,
					}}
				/>
			</View>
		</Animated.View>
	);
}
