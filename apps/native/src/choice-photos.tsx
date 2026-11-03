// The ways to pick, as storybook photos on the night sky: a cream frame round the place picture
// (16:10), the question written in the frame's bottom margin, a soft static shadow, a small tilt.
// The star stands between them with a "Which way?" balloon. They arrive in a calm dissolve: the
// photos fade in from a slightly larger scale, then the star rises and the balloon pops.
import { FallbackImage } from "@little-adventures/native-ui/fallback-image";
import { Icon } from "@little-adventures/native-ui/icons";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { StarTake } from "@little-adventures/native-ui/star-take";
import {
	colors,
	fonts,
	listCards,
	skyPalettes,
} from "@little-adventures/native-ui/tokens";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useMusic } from "@/src/data/music-store";
import type { NodeId, Picture } from "@/src/data/types";
import { type Language, useLanguage, useT } from "@/src/i18n";
import { choiceStrings } from "@/src/i18n/strings/choice";

const { choice } = listCards;

/** One way to pick. */
export interface Way {
	goal: boolean;
	/** What the way says: the place's question, else its name. */
	label: string;
	name: string;
	node: NodeId;
	picture: Picture | null;
	state: "drawing" | "locked" | "open";
}

// The design page's numbers (round 2, option C), as shares of the frame's width.
const FRAME = "#FBF4E0";
const PHOTO_RATIO = 16 / 10;
const PAD = 0.037;
const RADIUS = 0.0238;
const TEXT = 0.0714;
const TEXT_MIN = 14;
const TILT_DEG = 3;
const SHADOW = "rgba(0,0,0,0.4)";
const GOAL_HEIGHT = "74%";

// Sideways: two ways take about 35% of the width each with room for the star between them; three
// ways (two places and the goodnight) take about a quarter each, in a row.
const TWO_WIDTH = 0.35;
const TWO_GAP = 0.16;
const THREE_WIDTH = 0.235;
const THREE_GAP = 0.03;
const TWO_TOP = 0.17;
const THREE_TOP = 0.12;
// Upright (web): two across, a third centred under them.
const UPRIGHT_WIDTH = 0.44;
const UPRIGHT_GAP = 14;

// The entrance (calm dissolve), in ms. The photos come first, then the title, the star, the balloon.
const PHOTO_MS = 800;
const PHOTO_STAGGER_MS = 80;
const PHOTO_FROM = 1.06;
const TITLE_MS = 400;
const TITLE_AFTER_MS = 350;
const STAR_MS = 500;
const STAR_FROM = 0.7;
const BALLOON_MS = 260;
const BALLOON_FROM = 0.6;
const OUT = Easing.bezier(0.22, 1, 0.36, 1);
const SPRING = { dampingRatio: 0.6 } as const;
/** How long the whole entrance takes for `count` ways, from its start. */
export const enterMs = (count: number) =>
	PHOTO_MS + PHOTO_STAGGER_MS * (count - 1) + STAR_MS + BALLOON_MS;

// The star's spoken line (bundled, so it plays offline), and the words the balloon shows: the whole
// line when it fits in the room between the photos, else the short one. The words live in the
// choice strings (`ask1Long`, `ask1Short`, ...); the voice has one file per language.
const ASKS = [
	{
		audio: {
			en: require("../assets/voice/which-way.mp3"),
			he: require("../assets/voice/which-way.mp3"),
		},
		long: "ask1Long",
		short: "ask1Short",
	},
	{
		audio: {
			en: require("../assets/voice/which-way-2.mp3"),
			he: require("../assets/voice/which-way-2.mp3"),
		},
		long: "ask2Long",
		short: "ask2Short",
	},
	{
		audio: {
			en: require("../assets/voice/which-way-3.mp3"),
			he: require("../assets/voice/which-way-3.mp3"),
		},
		long: "ask3Long",
		short: "ask3Short",
	},
	{
		audio: {
			en: require("../assets/voice/which-way-4.mp3"),
			he: require("../assets/voice/which-way-4.mp3"),
		},
		long: "ask4Long",
		short: "ask4Short",
	},
	{
		audio: {
			en: require("../assets/voice/which-way-5.mp3"),
			he: require("../assets/voice/which-way-5.mp3"),
		},
		long: "ask5Long",
		short: "ask5Short",
	},
	{
		audio: {
			en: require("../assets/voice/which-way-6.mp3"),
			he: require("../assets/voice/which-way-6.mp3"),
		},
		long: "ask6Long",
		short: "ask6Short",
	},
] as const satisfies readonly {
	audio: Record<Language, number>;
	long: keyof typeof choiceStrings.en;
	short: keyof typeof choiceStrings.en;
}[];
type Ask = (typeof ASKS)[number];
// The last ask, so the next visit picks a different one.
let lastAsk = -1;
function nextAsk(): Ask {
	let index = Math.floor(Math.random() * (ASKS.length - 1));
	if (index >= lastAsk && lastAsk >= 0) {
		index += 1;
	}
	lastAsk = index;
	return ASKS[index];
}
const BALLOON_FONT = 20;
const BALLOON_PAD_X = 14;
/** A rough width of a line of balloon words, per character, as a share of the font size. */
const CHAR_WIDTH = 0.52;

const STAR_BOX_SIDEWAYS = 0.28;
const STAR_BOX_UPRIGHT = 0.22;
const STAR_BOTTOM = 19;
const BALLOON_GAP = 6;
const TAIL = 11;

const shadow = Platform.select({
	default: { boxShadow: `0px 10px 20px ${SHADOW}` },
	ios: {
		shadowColor: "#000000",
		shadowOffset: { height: 10, width: 0 },
		shadowOpacity: 0.4,
		shadowRadius: 14,
	},
});

const tiltOf = (index: number, count: number) => {
	if (count === 2) {
		return index === 0 ? -TILT_DEG : TILT_DEG;
	}
	return count === 3 ? (index - 1) * TILT_DEG : 0;
};

/** A fade (and a spring from a smaller or larger scale) that starts `delay` ms after mounting. */
function useArrival({
	delay,
	from,
	ms,
	spring = false,
}: {
	delay: number;
	from: number;
	ms: number;
	spring?: boolean;
}) {
	const calm = useCalm();
	const opacity = useSharedValue(calm ? 1 : 0);
	const scale = useSharedValue(calm ? 1 : from);
	useEffect(() => {
		if (calm) {
			return;
		}
		opacity.set(withDelay(delay, withTiming(1, { duration: ms, easing: OUT })));
		scale.set(
			withDelay(
				delay,
				spring
					? withSpring(1, { ...SPRING, duration: ms })
					: withTiming(1, { duration: ms, easing: OUT })
			)
		);
	}, [calm, delay, ms, opacity, scale, spring]);
	return { opacity, scale };
}

const imageKind = (goal: boolean, locked: boolean) => {
	if (!goal) {
		return "place";
	}
	return locked ? "goalClosed" : "goalOpen";
};

function Picture_({
	goal,
	picture,
	state,
}: {
	goal: boolean;
	picture: Picture | null;
	state: Way["state"];
}) {
	const locked = state === "locked";
	const drawing = state === "drawing";
	const placeholder = (
		<Placeholder icon="image" style={StyleSheet.absoluteFill} />
	);
	return (
		<View style={[styles.picture, goal && styles.goalBackdrop]}>
			<FallbackImage
				blurRadius={drawing ? choice.drawingBlur : 0}
				contentFit={goal ? "contain" : "cover"}
				kind={imageKind(goal, locked)}
				placeholder={placeholder}
				source={picture}
				style={
					goal
						? { height: GOAL_HEIGHT, width: "100%" }
						: StyleSheet.absoluteFill
				}
			/>
			{drawing ? (
				<>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: choice.drawingGrayVeil },
						]}
					/>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: choice.drawingBrightnessVeil },
						]}
					/>
				</>
			) : null}
			{locked ? (
				<>
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: choice.lockedGrayVeil },
						]}
					/>
					<View
						pointerEvents="none"
						style={[StyleSheet.absoluteFill, { backgroundColor: choice.dim }]}
					/>
				</>
			) : null}
		</View>
	);
}

/** One storybook photo: the whole frame is the button. */
function Photo({
	count,
	delay,
	index,
	missing,
	onPick,
	picked,
	way,
	width,
}: {
	count: number;
	delay: number;
	index: number;
	missing: number;
	onPick: (node: NodeId) => void;
	picked: boolean;
	way: Way;
	width: number;
}) {
	const { opacity, scale } = useArrival({
		delay,
		from: PHOTO_FROM,
		ms: PHOTO_MS,
	});
	// Worked out on the JS side: the animated style runs on the UI thread and cannot call tiltOf.
	const tilt = `${tiltOf(index, count)}deg`;
	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ rotate: tilt }, { scale: scale.get() }],
	}));
	const t = useT(choiceStrings);
	const locked = way.state === "locked";
	const drawing = way.state === "drawing";
	const pad = width * PAD;
	const font = Math.max(TEXT_MIN, width * TEXT);
	return (
		<Animated.View style={[{ width }, style]}>
			<Pressable
				accessibilityLabel={locked ? t("locked", { name: way.name }) : way.name}
				accessibilityRole="button"
				accessibilityState={{ busy: drawing, selected: picked }}
				disabled={drawing}
				onPress={() => {
					if (locked) {
						notificationAsync(NotificationFeedbackType.Warning);
						return;
					}
					onPick(way.node);
				}}
				style={[
					styles.frame,
					shadow,
					{
						borderRadius: width * RADIUS,
						paddingHorizontal: pad,
						paddingTop: pad,
					},
				]}
				testID={`choice-${way.node}`}
			>
				<Picture_ goal={way.goal} picture={way.picture} state={way.state} />
				<View
					style={{
						paddingBottom: width * 0.057,
						paddingHorizontal: width * 0.02,
						paddingTop: width * 0.046,
					}}
				>
					<Text
						allowFontScaling={false}
						style={[
							styles.question,
							{ fontSize: font, lineHeight: font * 1.12 },
						]}
					>
						{way.label}
					</Text>
					{locked ? (
						<View style={styles.note}>
							<Icon color={colors.inkNavy} name="lock" size={font} />
							<Text
								allowFontScaling={false}
								style={[styles.noteText, { fontSize: font * 0.85 }]}
							>
								{missing > 1
									? t("morePlaces", { count: missing })
									: t("morePlace")}
							</Text>
						</View>
					) : null}
				</View>
				{picked ? (
					<View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							styles.ring,
							{ borderRadius: width * RADIUS },
						]}
					/>
				) : null}
			</Pressable>
		</Animated.View>
	);
}

/**
 * Says the star's question once, as the balloon pops: the music bed ducks under the voice, as
 * under any voice. Not again on a repaint; with reduced motion it is still spoken.
 */
function useAskAloud(atMs: number, audio: number) {
	const player = useAudioPlayer(audio);
	const { didJustFinish, isLoaded } = useAudioPlayerStatus(player);
	const spoken = useRef<boolean>(false);
	const [due, setDue] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setDue(true), atMs);
		return () => clearTimeout(timer);
	}, [atMs]);
	useEffect(() => {
		if (due && isLoaded && !spoken.current) {
			spoken.current = true;
			useMusic.getState().setSpeaking(true);
			player.play();
		}
	}, [due, isLoaded, player]);
	useEffect(() => {
		if (didJustFinish) {
			useMusic.getState().setSpeaking(false);
		}
	}, [didJustFinish]);
	useEffect(() => () => useMusic.getState().setSpeaking(false), []);
}

/** The star with its balloon above it, at the bottom centre. */
function StarAndBalloon({
	delay,
	room,
	size,
	take,
}: {
	delay: number;
	/** How wide the gap between the photos is: the long line shows only when it fits. */
	room: number;
	size: number;
	take: "jump" | "point";
}) {
	const calm = useCalm();
	const t = useT(choiceStrings);
	const language = useLanguage();
	// A different question each visit (never the same twice in a row).
	const [ask] = useState(nextAsk);
	const rise = useArrival({
		delay,
		from: STAR_FROM,
		ms: STAR_MS,
		spring: true,
	});
	const pop = useArrival({
		delay: delay + STAR_MS,
		from: BALLOON_FROM,
		ms: BALLOON_MS,
		spring: true,
	});
	useAskAloud(calm ? delay : delay + STAR_MS, ask.audio[language]);
	const long = t(ask.long);
	const longWidth = long.length * BALLOON_FONT * CHAR_WIDTH + 2 * BALLOON_PAD_X;
	const line = room >= longWidth ? long : t(ask.short);
	const starStyle = useAnimatedStyle(() => ({
		opacity: rise.opacity.get(),
		// Rises from below: the spring's scale (0.7 to 1) says how far it has come.
		transform: [
			{
				translateY:
					((1 - rise.scale.get()) / (1 - STAR_FROM)) * size * STAR_FROM,
			},
		],
	}));
	const balloonStyle = useAnimatedStyle(() => ({
		opacity: pop.opacity.get(),
		transform: [{ scale: pop.scale.get() }],
	}));
	return (
		<View pointerEvents="none" style={styles.starRow}>
			<Animated.View style={starStyle}>
				<StarTake size={size} take={take} />
			</Animated.View>
			<Animated.View
				style={[
					styles.balloonRow,
					{ bottom: STAR_BOTTOM + size + BALLOON_GAP },
					balloonStyle,
				]}
			>
				<View style={styles.balloon}>
					<Text allowFontScaling={false} style={styles.balloonText}>
						{line}
					</Text>
				</View>
				<View style={styles.tail} />
			</Animated.View>
		</View>
	);
}

/** The waiting star: it thinks, with no balloon, since nothing can be chosen yet. */
function ThinkingStar({ size }: { size: number }) {
	return (
		<View pointerEvents="none" style={styles.starRow}>
			<StarTake size={size} take="think" />
		</View>
	);
}

/** The pill at the top fades in with the photos (sideways; upright keeps the screen's own title). */
export function TitleArrival({
	children,
	delay,
}: {
	children: ReactNode;
	delay: number;
}) {
	const { opacity } = useArrival({
		delay: delay + TITLE_AFTER_MS,
		from: 1,
		ms: TITLE_MS,
	});
	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return <Animated.View style={style}>{children}</Animated.View>;
}

/** The night-sky gradient behind the ways. */
export function NightBackdrop() {
	return (
		<LinearGradient
			colors={skyPalettes.night.colors}
			locations={skyPalettes.night.locations}
			pointerEvents="none"
			style={StyleSheet.absoluteFill}
		/>
	);
}

/** The size of a photo, the space between and above them, and the star, for a space `box` big. */
function geometry(
	box: { height: number; width: number },
	sideways: boolean,
	three: boolean
) {
	if (!sideways) {
		return {
			gap: UPRIGHT_GAP,
			size: Math.round(box.width * STAR_BOX_UPRIGHT),
			top: 8,
			width: box.width * UPRIGHT_WIDTH,
		};
	}
	return {
		gap: box.width * (three ? THREE_GAP : TWO_GAP),
		size: Math.round(box.height * STAR_BOX_SIDEWAYS),
		top: box.height * (three ? THREE_TOP : TWO_TOP),
		width: box.width * (three ? THREE_WIDTH : TWO_WIDTH),
	};
}

/**
 * The photos, the star and the balloon, filling the space they are given. `sideways` lays them
 * in a row across the screen; upright they wrap two across. `delay` is when the entrance begins.
 */
export function ChoicePhotos({
	delay,
	missing,
	onPick,
	picked,
	sideways,
	starTake,
	ways,
}: {
	delay: number;
	missing: number;
	onPick: (node: NodeId) => void;
	picked: NodeId | null;
	sideways: boolean;
	/** The star's take; "think" (nothing to choose yet) has no balloon and no voice. */
	starTake: "jump" | "point" | "think" | null;
	ways: Way[];
}) {
	const [box, setBox] = useState({ height: 0, width: 0 });
	const count = ways.length;
	const { gap, size, top, width } = geometry(box, sideways, count > 2);
	const starSize = size;
	return (
		<View
			onLayout={(event: LayoutChangeEvent) => {
				const { height, width: w } = event.nativeEvent.layout;
				setBox((prev) =>
					prev.height === height && prev.width === w
						? prev
						: { height, width: w }
				);
			}}
			style={styles.fill}
		>
			{box.width > 0 ? (
				<>
					<View
						style={[
							styles.row,
							{
								columnGap: gap,
								flexWrap: sideways ? "nowrap" : "wrap",
								paddingTop: top,
								rowGap: gap,
							},
						]}
					>
						{ways.map((way, index) => (
							<Photo
								count={count}
								delay={delay + index * PHOTO_STAGGER_MS}
								index={index}
								key={way.node}
								missing={missing}
								onPick={onPick}
								picked={picked === way.node}
								way={way}
								width={width}
							/>
						))}
					</View>
					{starTake === "think" ? <ThinkingStar size={starSize} /> : null}
					{starTake === "point" || starTake === "jump" ? (
						<StarAndBalloon
							delay={delay + PHOTO_MS + PHOTO_STAGGER_MS * (count - 1)}
							room={sideways ? gap : 0}
							size={starSize}
							take={starTake}
						/>
					) : null}
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	balloon: {
		backgroundColor: colors.sand,
		borderRadius: 28,
		paddingBottom: 8,
		paddingHorizontal: BALLOON_PAD_X,
		paddingTop: 6,
	},
	balloonRow: { alignItems: "center", left: 0, position: "absolute", right: 0 },
	balloonText: {
		color: colors.inkNavy,
		fontFamily: fonts.label,
		fontSize: BALLOON_FONT,
		lineHeight: BALLOON_FONT * 1.2,
	},
	fill: { flex: 1 },
	frame: { backgroundColor: FRAME },
	goalBackdrop: {
		alignItems: "center",
		backgroundColor: colors.goalBackdrop,
		justifyContent: "center",
	},
	note: {
		alignItems: "center",
		flexDirection: "row",
		gap: 6,
		justifyContent: "center",
		marginTop: 4,
	},
	noteText: { color: colors.inkNavy, fontFamily: fonts.label },
	picture: {
		aspectRatio: PHOTO_RATIO,
		overflow: "hidden",
		width: "100%",
	},
	question: {
		color: colors.inkNavy,
		fontFamily: fonts.label,
		textAlign: "center",
	},
	ring: { borderColor: colors.sun, borderWidth: choice.ringWidth },
	row: {
		alignItems: "flex-start",
		flexDirection: "row",
		justifyContent: "center",
	},
	starRow: {
		alignItems: "center",
		bottom: STAR_BOTTOM,
		left: 0,
		position: "absolute",
		right: 0,
	},
	tail: {
		borderLeftColor: "transparent",
		borderLeftWidth: TAIL,
		borderRightColor: "transparent",
		borderRightWidth: TAIL,
		borderTopColor: colors.sand,
		borderTopWidth: TAIL,
		height: 0,
		marginTop: -1,
		width: 0,
	},
});
