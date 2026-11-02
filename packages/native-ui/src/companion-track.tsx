import { selectionAsync } from "expo-haptics";
import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
	cubicBezier,
	Easing,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { ClaySurface } from "./clay-surface";
import { ClayText } from "./clay-text";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { colors, motion, radii, select } from "./tokens";

const easeOut = cubicBezier(...motion.easeOut);
const overshoot = cubicBezier(...motion.overshoot);

/** One choice of exactly one of two: who comes along. */
export type Companion = "puppy" | "you";

const PUPPY_FILE = require("../assets/characters/puppy.png");
const PUPPY_RATIO = 480 / 463;
const PUPPY_WIDTH = 0.92;
const PUPPY_SINK = 0.06;
const TRACK_PAD = 6;
const TRACK_RADIUS = 44;
const THUMB_RADIUS = 38;
const FACE_RING = 3;
const CHECK_DISC = 32;
const CHECK_ICON = 18;
const CHECK_INSET = 12;

const sizes = {
	compact: { face: 80, height: 182 },
	tall: { face: 104, height: 228 },
} as const;

/** The round check on a chosen card: a dark disc, the check pops in. Off, it is an empty tint. */
export function CheckDisc({
	empty = colors.toggleOff,
	icon,
	on,
	size,
}: {
	empty?: string;
	icon: number;
	on: boolean;
	size: number;
}) {
	const calm = useCalm();
	const ms = (n: number) => (calm ? 0 : n);
	return (
		<Animated.View
			style={{
				alignItems: "center",
				backgroundColor: on ? colors.inkNavy : empty,
				borderRadius: size / 2,
				height: size,
				justifyContent: "center",
				transitionDuration: ms(select.toggleColor),
				transitionProperty: "backgroundColor",
				transitionTimingFunction: "ease-in-out",
				width: size,
			}}
		>
			<Animated.View
				style={{
					opacity: on ? 1 : 0,
					transform: [{ scale: on || calm ? 1 : 0.3 }],
					transitionDuration: [ms(select.toggleFade), ms(select.togglePop)],
					transitionProperty: ["opacity", "transform"],
					transitionTimingFunction: [easeOut, overshoot],
				}}
			>
				<Icon color={colors.sunHi} name="check" size={icon} />
			</Animated.View>
		</Animated.View>
	);
}

function YouFace({ size, uri }: { size: number; uri: string | null }) {
	return (
		<View style={[styles.face, styles.youFace, { height: size, width: size }]}>
			{uri ? (
				<Image
					accessibilityIgnoresInvertColors
					contentFit="cover"
					source={{ uri }}
					style={styles.fill}
				/>
			) : (
				<Icon name="user" size={select.toggleIcon} />
			)}
		</View>
	);
}

function PuppyFace({ size }: { size: number }) {
	return (
		<View
			style={[styles.face, styles.puppyFace, { height: size, width: size }]}
		>
			<Image
				accessibilityIgnoresInvertColors
				contentFit="contain"
				source={PUPPY_FILE}
				style={{
					aspectRatio: PUPPY_RATIO,
					marginBottom: -size * PUPPY_SINK,
					width: size * PUPPY_WIDTH,
				}}
			/>
		</View>
	);
}

function Seat({
	children,
	name,
	on,
	onPress,
	subtitle,
	title,
}: {
	children: ReactNode;
	name: string;
	on: boolean;
	onPress: () => void;
	subtitle: string;
	title: string;
}) {
	const ink = on ? colors.inkNavy : colors.cream;
	return (
		<Pressable
			accessibilityLabel={`${title}, ${subtitle}`}
			accessibilityRole="radio"
			accessibilityState={{ checked: on }}
			onPress={() => {
				selectionAsync();
				onPress();
			}}
			style={styles.seat}
			testID={`companion-${name}`}
		>
			<View style={styles.disc}>
				<CheckDisc
					empty="rgba(244,236,216,0.14)"
					icon={CHECK_ICON}
					on={on}
					size={CHECK_DISC}
				/>
			</View>
			{children}
			<ClayText align="center" color={ink} variant="toggleTitle">
				{title}
			</ClayText>
			<ClayText
				align="center"
				color={ink}
				style={styles.subtitle}
				variant="toggleSubtitle"
			>
				{subtitle}
			</ClayText>
		</Pressable>
	);
}

/**
 * Who's coming: one dark track holding two big faces. A lit thumb slides behind the chosen
 * one, so it reads as one of two. `value` null (nothing chosen yet) hides the thumb.
 */
export function CompanionTrack({
	compact = false,
	onChange,
	photoUri,
	value,
	youSubtitle,
}: {
	compact?: boolean;
	onChange: (next: Companion) => void;
	photoUri: string | null;
	value: Companion | null;
	youSubtitle: string;
}) {
	const calm = useCalm();
	const { face, height } = compact ? sizes.compact : sizes.tall;
	const [width, setWidth] = useState(0);
	const thumbWidth = Math.max(0, (width - TRACK_PAD * 2) / 2);
	const slot = value === "puppy" ? 1 : 0;
	const shown = value ? 1 : 0;

	const thumb = useAnimatedStyle(() => {
		const timing = {
			duration: calm ? 0 : motion.enter,
			easing: Easing.bezier(...motion.overshoot),
		};
		return {
			opacity: withTiming(shown, { duration: calm ? 0 : motion.select }),
			transform: [{ translateX: withTiming(slot * thumbWidth, timing) }],
		};
	});

	return (
		<View
			accessibilityLabel="Who's coming"
			accessibilityRole="radiogroup"
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
			style={[styles.track, { height }]}
		>
			<Animated.View
				pointerEvents="none"
				style={[styles.thumb, { width: thumbWidth }, thumb]}
			>
				<ClaySurface radius={THUMB_RADIUS} style={styles.fill} tone="sun" />
			</Animated.View>
			<Seat
				name="you"
				on={value === "you"}
				onPress={() => onChange("you")}
				subtitle={youSubtitle}
				title="You"
			>
				<YouFace size={face} uri={photoUri} />
			</Seat>
			<Seat
				name="puppy"
				on={value === "puppy"}
				onPress={() => onChange("puppy")}
				subtitle="Best friend"
				title="Puppy"
			>
				<PuppyFace size={face} />
			</Seat>
		</View>
	);
}

const styles = StyleSheet.create({
	disc: { position: "absolute", right: CHECK_INSET, top: CHECK_INSET },
	face: {
		alignItems: "center",
		borderRadius: 999,
		marginBottom: 6,
		overflow: "hidden",
	},
	fill: { height: "100%", width: "100%" },
	puppyFace: { backgroundColor: colors.puppyDisc, justifyContent: "flex-end" },
	seat: {
		alignItems: "center",
		borderRadius: radii.card,
		flex: 1,
		gap: 2,
		justifyContent: "center",
	},
	subtitle: { opacity: 0.75 },
	thumb: {
		bottom: TRACK_PAD,
		left: TRACK_PAD,
		position: "absolute",
		top: TRACK_PAD,
	},
	track: {
		backgroundColor: "rgba(11,22,48,0.65)",
		borderRadius: TRACK_RADIUS,
		boxShadow:
			"inset 0px 3px 7px rgba(0,0,0,0.53), inset 0px -2px 0px rgba(255,255,255,0.13)",
		flexDirection: "row",
		padding: TRACK_PAD,
	},
	youFace: {
		backgroundColor: colors.sand,
		boxShadow: `0px 0px 0px ${FACE_RING}px #F8EED1, 0px 6px 8px -3px rgba(0,0,0,0.4)`,
		justifyContent: "center",
		overflow: "hidden",
	},
});
