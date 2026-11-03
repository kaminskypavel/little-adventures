// The two cards a place can open with. The question card sits over the first picture while the
// star asks the child's question (the words light up as they are said); the "What we learned"
// card lists every place's question with its answer before the goodnight scene. Both hold the
// place's player through `question-gate`: it starts when the card lets go.
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { StarTake } from "@little-adventures/native-ui/star-take";
import {
	colors,
	fonts,
	layout,
	motion,
} from "@little-adventures/native-ui/tokens";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { Fragment, type ReactNode, useCallback, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import {
	useSafeAreaFrame,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useMusic } from "@/src/data/music-store";
import { wordIndexAt } from "@/src/data/playback";
import { useGate } from "@/src/data/question-gate";
import type { Learned } from "@/src/data/question-rules";
import type { NarrationAudio } from "@/src/data/types";

/** The card shows this long when there is no audio to wait for. */
export const NO_AUDIO_MS = 2500;
/** After the audio ends the card holds this long, then fades and the scene starts. */
export const AFTER_AUDIO_MS = 400;
/** An audio that never loads lets go of the card after this long. */
const LOAD_GIVE_UP_MS = 5000;
/** An audio that loaded but never reports its end lets go this long after it should have ended. */
const END_SLACK_MS = 1500;
const AUDIO_TICK_MS = 100;
const FADE_MS = motion.enter;

/** The question card lets go over this long: the star and balloon fade, the veil lifts. */
const ASK_FADE_MS = 450;
// The star asks: 96 pt at the lower left, a speech balloon beside it, a veil on the picture.
const STAR = 96;
const STAR_BOTTOM = 26;
const ASK_LIFT = 72;
const HOP_FROM = 16;
const HOP_MS = 500;
const HOP_EASING = Easing.bezier(...motion.overshoot);
const VEIL = ["rgba(10,22,44,0.5)", "rgba(10,22,44,0.15)"] as const;
const TAIL_W = 30;
/** Below this much room beside the star, the question steps down from 30 to 25 pt. */
const COMPACT_ROOM = 480;
const TAIL_H = 26;

const SCRIM_RECAP = 0.74;
const SCRIM_COLOR = "#0E1B33";
const RULE = "rgba(14,27,51,0.14)";

/** The card fades in as it mounts and out when the gate lets the place go. */
function useFade(fading: boolean, ms: number = FADE_MS) {
	const calm = useCalm();
	const opacity = useSharedValue(calm ? 1 : 0);
	useEffect(() => {
		opacity.set(withTiming(fading ? 0 : 1, { duration: calm ? 0 : ms }));
	}, [calm, fading, ms, opacity]);
	return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}

function Scrim({ strength }: { strength: number }) {
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{ backgroundColor: SCRIM_COLOR, opacity: strength },
			]}
		/>
	);
}

/**
 * A question with its words timed: one native text, so the phone wraps and measures it itself, the
 * word being said lit on the sun (nested spans; per-word boxes mis-measured on iOS and ran out of
 * the balloon). The rest stay full ink.
 */
function Words({
	compact,
	current,
	words,
}: {
	compact: boolean;
	current: number;
	words: string[];
}) {
	return (
		<Text
			accessibilityLabel={words.join(" ")}
			allowFontScaling={false}
			style={[styles.question, compact && styles.questionCompact]}
		>
			{words.map((word, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the same word can repeat, the position is the identity
				<Fragment key={`${index}-${word}`}>
					{index > 0 ? " " : ""}
					<Text style={index === current ? styles.now : undefined}>{word}</Text>
				</Fragment>
			))}
		</Text>
	);
}

/**
 * The child's question over the first picture, asked by the star. With the narrator's audio it
 * plays, the bed ducks as under any voice, and ~400 ms after it ends the card lets go; without
 * audio it shows for 2.5 s. `by` is a small line under the question ("Sunny asked", the intro).
 * `gateKey` is this opening's key in `question-gate`.
 */
export function QuestionCard({
	audio,
	by,
	gateKey,
	question,
}: {
	audio: NarrationAudio | null;
	by?: string;
	gateKey: string;
	question: string;
}) {
	const calm = useCalm();
	const insets = useSafeAreaInsets();
	const frame = useSafeAreaFrame();
	const fading = useGate((s) => s.key === gateKey && s.phase === "fading");
	const style = useFade(fading, ASK_FADE_MS);
	const player = useAudioPlayer(audio?.url ?? null, {
		updateInterval: AUDIO_TICK_MS,
	});
	const heard = useAudioPlayerStatus(player);
	const { currentTime, didJustFinish, duration, isLoaded } = heard;
	const letGo = useCallback(
		() => useGate.getState().finish(gateKey, calm ? 0 : ASK_FADE_MS),
		[calm, gateKey]
	);

	// The narrator speaks: the bed ducks, and the audio plays once it is loaded.
	useEffect(() => {
		if (!audio) {
			return;
		}
		useMusic.getState().setSpeaking(true);
		return () => useMusic.getState().setSpeaking(false);
	}, [audio]);
	useEffect(() => {
		if (audio && isLoaded) {
			player.play();
		}
	}, [audio, isLoaded, player]);

	// The way out when the audio never ends: none to wait for, none that loads, or none that reports.
	useEffect(() => {
		let ms = NO_AUDIO_MS;
		if (audio) {
			ms = isLoaded ? duration * 1000 + END_SLACK_MS : LOAD_GIVE_UP_MS;
		}
		const timer = setTimeout(letGo, ms);
		return () => clearTimeout(timer);
	}, [audio, duration, isLoaded, letGo]);
	// The audio ended: a breath, then the card lets go. No cleanup: the flag drops on the next tick,
	// and letting go twice is harmless.
	useEffect(() => {
		if (didJustFinish) {
			setTimeout(letGo, AFTER_AUDIO_MS);
		}
	}, [didJustFinish, letGo]);

	const timed = audio?.words.length ? audio.words : null;
	const words = timed ? timed.map((w) => w.text) : question.split(" ");
	// Without timings nothing is lit and nothing waits.
	const current = timed
		? wordIndexAt(timed, currentTime, duration)
		: words.length;

	// The star hops up into place as the card opens.
	const rise = useSharedValue(calm ? 1 : 0);
	const show = useSharedValue(calm ? 1 : 0);
	useEffect(() => {
		if (!calm) {
			rise.set(withTiming(1, { duration: HOP_MS, easing: HOP_EASING }));
			show.set(withTiming(1, { duration: motion.enter }));
		}
	}, [calm, rise, show]);
	const hop = useAnimatedStyle(() => ({
		opacity: show.get(),
		transform: [{ translateY: (1 - rise.get()) * HOP_FROM }],
	}));
	const appear = useAnimatedStyle(() => ({ opacity: show.get() }));
	const left = insets.left + layout.sideMargin;
	const bottom = STAR_BOTTOM + insets.bottom;
	const askLeft = left + STAR + 8;
	// A narrow screen steps the words down a size so the balloon keeps clear of the top.
	const compact =
		frame.width - askLeft - insets.right - layout.sideMargin < COMPACT_ROOM;
	return (
		<Animated.View pointerEvents="box-none" style={[styles.root, style]}>
			<LinearGradient
				colors={VEIL}
				end={{ x: 1, y: 0.5 }}
				pointerEvents="none"
				start={{ x: 0, y: 0.5 }}
				style={StyleSheet.absoluteFill}
			/>
			<View pointerEvents="none" style={StyleSheet.absoluteFill}>
				<Animated.View style={[styles.star, { bottom, left }, hop]}>
					<StarTake size={STAR} take="think" />
				</Animated.View>
				{/* The balloon's row spans to the right edge, so the words always have a definite width
				    to wrap in: a long question takes more lines, never runs out of the balloon. */}
				<View
					style={[
						styles.askRow,
						{
							bottom: bottom + ASK_LIFT,
							left: askLeft,
							right: insets.right + layout.sideMargin,
						},
					]}
				>
					<Animated.View style={[styles.ask, appear]} testID="question-card">
						<View style={styles.tail} />
						<Words compact={compact} current={current} words={words} />
						{by ? (
							<Text allowFontScaling={false} style={styles.by}>
								{by}
							</Text>
						) : null}
					</Animated.View>
				</View>
			</View>
		</Animated.View>
	);
}

/**
 * The player chrome (back, name, menu, pause, captions, progress) while a question card is up:
 * it fades out, comes back as the card lets go, and takes no touches meanwhile.
 */
export function ChromeFade({ children }: { children: ReactNode }) {
	const calm = useCalm();
	const asking = useGate((s) => s.asking);
	const opacity = useSharedValue(asking ? 0 : 1);
	useEffect(() => {
		opacity.set(
			withTiming(asking ? 0 : 1, { duration: calm ? 0 : motion.enter })
		);
	}, [asking, calm, opacity]);
	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return (
		<Animated.View
			pointerEvents={asking ? "none" : "box-none"}
			style={[StyleSheet.absoluteFill, style]}
		>
			{children}
		</Animated.View>
	);
}

/** Before goodnight: every place's question with its answer, and the button that starts it. */
export function RecapCard({
	gateKey,
	rows,
}: {
	gateKey: string;
	rows: Learned[];
}) {
	const calm = useCalm();
	const fading = useGate((s) => s.key === gateKey && s.phase === "fading");
	const style = useFade(fading);
	return (
		<Animated.View pointerEvents="box-none" style={[styles.root, style]}>
			<Scrim strength={SCRIM_RECAP} />
			<View style={styles.recap} testID="recap-card">
				<Text allowFontScaling={false} style={styles.title}>
					What we learned
				</Text>
				{rows.map((row) => (
					<View key={row.node} style={styles.row}>
						<Text allowFontScaling={false} style={styles.asked}>
							{row.question}
						</Text>
						<Text allowFontScaling={false} style={styles.answer}>
							{row.answer}
						</Text>
					</View>
				))}
			</View>
			<PrimaryButton
				disabled={fading}
				label="Goodnight"
				labelSize={21}
				onPress={() => useGate.getState().finish(gateKey, calm ? 0 : FADE_MS)}
				size="md"
				style={styles.go}
				testID="goodnight-button"
			/>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	answer: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: 17,
		lineHeight: 21,
	},
	ask: {
		backgroundColor: colors.sand,
		borderRadius: 28,
		flexShrink: 1,
		maxWidth: 520,
		paddingBottom: 18,
		paddingHorizontal: 24,
		paddingTop: 16,
	},
	asked: {
		color: colors.inkNavy,
		fontFamily: fonts.label,
		fontSize: 13,
		lineHeight: 16,
		opacity: 0.7,
	},
	askRow: { alignItems: "flex-start", position: "absolute" },
	by: {
		color: colors.inkNavy,
		fontFamily: fonts.label,
		fontSize: 18,
		lineHeight: 22,
		marginTop: 6,
		opacity: 0.7,
	},
	go: {
		alignSelf: "center",
		height: 60,
		marginTop: 12,
		paddingHorizontal: 40,
	},
	now: {
		backgroundColor: colors.sun,
		borderRadius: 8,
		color: colors.nowWordInk,
	},
	question: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: 30,
		lineHeight: 34.5,
	},
	questionCompact: { fontSize: 25, lineHeight: 29 },
	recap: {
		backgroundColor: colors.cream,
		borderRadius: 24,
		maxWidth: 460,
		paddingHorizontal: 22,
		paddingVertical: 12,
		width: "86%",
	},
	root: {
		alignItems: "center",
		bottom: 0,
		justifyContent: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	row: { borderColor: RULE, borderTopWidth: 1.5, gap: 1, paddingVertical: 6 },
	star: { position: "absolute" },
	// A small tail pointing down-left to the star: a right triangle from borders.
	tail: {
		borderBottomColor: colors.sand,
		borderBottomWidth: TAIL_H,
		borderLeftColor: "transparent",
		borderLeftWidth: TAIL_W,
		bottom: 18,
		height: 0,
		left: -14,
		position: "absolute",
		width: 0,
	},
	title: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: 22,
		lineHeight: 28,
		paddingBottom: 4,
		textAlign: "center",
	},
});
