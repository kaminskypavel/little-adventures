import { Image } from "expo-image";
import { View, type ViewStyle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useCalm } from "./motion-provider";
import { Placeholder } from "./placeholder";
import { colors, iconSizes, motion } from "./tokens";

// Loader pictures, option C (390 x 844 phone, pt): a low clay ridge runs 50 past both edges, its
// top 76 above the bottom, drawn in front of the pictures so they peek over it.
const ridge = { bottom: -124, height: 200, side: -50 } as const;
// The ridge's `radial-gradient(ellipse at 38% 22%, ...)`, farthest corner: in this view box,
// stretched over the ridge, the ellipse is a circle whatever the ridge's size.
const view = { cx: 47.8, cy: 22, height: 100, r: 110.3, width: 125.8 } as const;

const ridgeShadow = [
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

// The child at the bottom left, the grown-up at the bottom right; each leans toward the middle.
const childSlot = { bottom: 4, height: 200, left: 18, width: 151 } as const;
const companionSlot = {
	bottom: 27,
	height: 145,
	right: 18,
	width: 150,
} as const;
const CHILD_TILT = "5deg";
const COMPANION_TILT = "-5deg";
const pictureFilter = "drop-shadow(0px 7px 7px rgba(0,0,0,0.4))";

const SLIDE_MS = 800;
const slideEase = cubicBezier(0.2, 0.8, 0.2, 1);
const popEase = cubicBezier(...motion.overshoot);
// The grown-up follows the child a moment later each time.
const companionDelays = { away: 80, enter: 120, pop: 200 } as const;
const RIDGE_AWAY_DELAY = 150;
// Four hops (2800 ms each) per peek: a 6 pt bob, and once per cycle a 22 pt peek with a lean.
const PEEK_CYCLE = motion.hop * 4;
const BOB = -6;
const PEEK = -22;
const POP = -26;

const still = { transform: [{ translateY: 0 }, { rotate: "0deg" }] };
const bob = { transform: [{ translateY: BOB }, { rotate: "0deg" }] };
const peekOf = (tilt: string) => ({
	transform: [{ translateY: PEEK }, { rotate: tilt }],
});

/** The child peeks at 82 to 92 percent of the cycle; the grown-up half a cycle earlier. */
const childPeek = {
	"0%, 25%, 50%, 75%, 100%": still,
	"12.5%, 37.5%, 62.5%": bob,
	"82%, 92%": peekOf(CHILD_TILT),
};
const companionPeek = {
	"0%, 25%, 50%, 75%, 100%": still,
	"12.5%, 62.5%, 87.5%": bob,
	"32%, 42%": peekOf(COMPANION_TILT),
};

/** A stage change: up 26 pt, lean in, lean back, settle. */
const popOf = (tilt: string, flip: string) => ({
	"0%, 100%": still,
	"35%": { transform: [{ translateY: POP }, { rotate: tilt }] },
	"65%": { transform: [{ translateY: POP }, { rotate: flip }] },
});
// Two identical copies: alternating them on each new stage plays the pop again.
const childPops = [
	popOf(CHILD_TILT, COMPANION_TILT),
	popOf(CHILD_TILT, COMPANION_TILT),
];
const companionPops = [
	popOf(COMPANION_TILT, CHILD_TILT),
	popOf(COMPANION_TILT, CHILD_TILT),
];

const riseIn = {
	from: { transform: [{ translateY: 150 }] },
	to: { transform: [{ translateY: 0 }] },
};
const duckAway = {
	"0%": { transform: [{ translateY: 0 }] },
	"25%": { transform: [{ translateY: -16 }] },
	"100%": { transform: [{ translateY: 230 }] },
};
const ridgeAway = {
	from: { transform: [{ translateY: 0 }] },
	to: { transform: [{ translateY: 140 }] },
};
const fadeIn = { from: { opacity: 0 }, to: { opacity: 1 } };
const fadeOut = { from: { opacity: 1 }, to: { opacity: 0 } };

/** Who stands at the ridge: the drawn look cut out of its backdrop, else the round look. */
export interface RidgePerson {
	/** The drawn look with a clear background; null until it is cut out. */
	cut: string | null;
	/** The round drawn look; null shows the neutral placeholder. */
	round: string | null;
}

/** Arrives from below (or fades in), and ducks behind the ridge when the adventure is ready. */
function slideStyle(
	away: boolean,
	calm: boolean,
	delays: { away: number; enter: number }
) {
	if (calm) {
		return {
			animationDuration: `${motion.reducedReveal}ms`,
			animationFillMode: "both",
			animationName: away ? fadeOut : fadeIn,
		} as const;
	}
	return {
		animationDelay: `${away ? delays.away : delays.enter}ms`,
		animationDuration: `${SLIDE_MS}ms`,
		animationFillMode: "both",
		animationName: away ? duckAway : riseIn,
		animationTimingFunction: slideEase,
	} as const;
}

/** The picture itself: the cut-out hangs from the slot's top, the round look sits at the top. */
function Picture({ person, width }: { person: RidgePerson; width: number }) {
	if (person.cut) {
		return (
			<Image
				accessibilityIgnoresInvertColors
				contentFit="contain"
				contentPosition="top"
				source={{ uri: person.cut }}
				style={{ flex: 1 }}
			/>
		);
	}
	const round = { borderRadius: width / 2, height: width, width };
	return person.round ? (
		<Image
			accessibilityIgnoresInvertColors
			contentFit="cover"
			source={{ uri: person.round }}
			style={round}
		/>
	) : (
		<Placeholder icon="user" iconSize={iconSizes.hero} style={round} />
	);
}

/** One person at the ridge: slides in, bobs and peeks, pops at each stage, ducks away. */
function Peeker({
	away,
	calm,
	delays,
	peek,
	person,
	pops,
	slot,
	stage,
}: {
	away: boolean;
	calm: boolean;
	delays: { away: number; enter: number; pop: number };
	peek: typeof childPeek | typeof companionPeek;
	person: RidgePerson;
	pops: ReturnType<typeof popOf>[];
	slot: ViewStyle & { width: number };
	stage: number;
}) {
	// No pop on arrival; each later stage alternates the copy, which plays the pop again.
	const pop =
		calm || stage === 0
			? null
			: ({
					animationDelay: `${delays.pop}ms`,
					animationDuration: `${motion.pulse}ms`,
					animationName: pops[stage % 2],
					animationTimingFunction: popEase,
				} as const);
	return (
		<Animated.View
			style={[{ position: "absolute" }, slot, slideStyle(away, calm, delays)]}
		>
			<Animated.View style={[{ flex: 1, transformOrigin: "50% 100%" }, pop]}>
				<Animated.View
					style={[
						{ filter: pictureFilter, flex: 1, transformOrigin: "50% 100%" },
						calm
							? null
							: {
									animationDuration: `${PEEK_CYCLE}ms`,
									animationIterationCount: "infinite",
									animationName: peek,
									animationTimingFunction: "ease-in-out",
								},
					]}
				>
					<Picture person={person} width={slot.width} />
				</Animated.View>
			</Animated.View>
		</Animated.View>
	);
}

/** The clay ridge across the bottom, in front of the pictures. */
/** The ridge slides down after the pictures (or fades out) when the adventure is ready. */
function ridgeMotion(away: boolean, calm: boolean) {
	if (!away) {
		return null;
	}
	if (calm) {
		return {
			animationDuration: `${motion.reducedReveal}ms`,
			animationFillMode: "forwards",
			animationName: fadeOut,
		} as const;
	}
	return {
		animationDelay: `${RIDGE_AWAY_DELAY}ms`,
		animationDuration: `${SLIDE_MS}ms`,
		animationFillMode: "forwards",
		animationName: ridgeAway,
		animationTimingFunction: slideEase,
	} as const;
}

function Ridge({ away, calm }: { away: boolean; calm: boolean }) {
	return (
		<Animated.View
			style={[
				{
					borderRadius: "50%",
					bottom: ridge.bottom,
					height: ridge.height,
					left: ridge.side,
					position: "absolute",
					right: ridge.side,
				},
				ridgeMotion(away, calm),
			]}
		>
			<Svg
				height="100%"
				preserveAspectRatio="none"
				viewBox={`0 0 ${view.width} ${view.height}`}
				width="100%"
			>
				<Defs>
					<RadialGradient
						cx={view.cx}
						cy={view.cy}
						gradientUnits="userSpaceOnUse"
						id="peek-ridge"
						r={view.r}
					>
						<Stop offset="0" stopColor={colors.hillHi} />
						<Stop offset="0.62" stopColor={colors.hillMid} />
						<Stop offset="1" stopColor={colors.hillLo} />
					</RadialGradient>
				</Defs>
				<Ellipse
					cx={view.width / 2}
					cy={view.height / 2}
					fill="url(#peek-ridge)"
					rx={view.width / 2}
					ry={view.height / 2}
				/>
			</Svg>
			<View
				pointerEvents="none"
				style={{
					borderRadius: "50%",
					bottom: 0,
					boxShadow: ridgeShadow,
					left: 0,
					position: "absolute",
					right: 0,
					top: 0,
				}}
			/>
		</Animated.View>
	);
}

/**
 * 10a: the child (and the grown-up when they come along) peek over a clay ridge at the bottom of
 * the wait screen. They rise in, bob and peek now and then, pop up at each `stage`, and duck
 * away with the ridge when `away`. Reduced motion keeps them still and fades them in and out.
 * Absolute, so the parent must fill the screen.
 */
export function PeekRidge({
	away = false,
	child,
	companion = null,
	stage = 0,
}: {
	away?: boolean;
	child: RidgePerson;
	/** The grown-up; null when the child comes alone (the puppy is in the loop already). */
	companion?: RidgePerson | null;
	stage?: number;
}) {
	const calm = useCalm();
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}
		>
			<Peeker
				away={away}
				calm={calm}
				delays={{ away: 0, enter: 0, pop: 0 }}
				peek={childPeek}
				person={child}
				pops={childPops}
				slot={childSlot}
				stage={stage}
			/>
			{companion ? (
				<Peeker
					away={away}
					calm={calm}
					delays={companionDelays}
					peek={companionPeek}
					person={companion}
					pops={companionPops}
					slot={companionSlot}
					stage={stage}
				/>
			) : null}
			<Ridge away={away} calm={calm} />
		</View>
	);
}
