// The two cards a place can open with. The question card sits over the first picture while the
// narrator asks the child's question (the words light up as they are said); the "What we learned"
// card lists every place's question with its answer before the goodnight scene. Both hold the
// place's player through `question-gate`: it starts when the card lets go.
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { colors, fonts, motion } from "@little-adventures/native-ui/tokens";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
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

const SCRIM_QUESTION = 0.6;
const SCRIM_RECAP = 0.74;
const SCRIM_COLOR = "#0E1B33";
const RULE = "rgba(14,27,51,0.14)";
const BADGE = 44;

/** The card fades in as it mounts and out when the gate lets the place go. */
function useFade(fading: boolean) {
	const calm = useCalm();
	const opacity = useSharedValue(calm ? 1 : 0);
	useEffect(() => {
		opacity.set(withTiming(fading ? 0 : 1, { duration: calm ? 0 : FADE_MS }));
	}, [calm, fading, opacity]);
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

/** A question with its words timed: the one being said sits on a sun chip, the rest wait. */
function Words({ current, words }: { current: number; words: string[] }) {
	return (
		<View accessibilityLabel={words.join(" ")} accessible style={styles.words}>
			{words.map((word, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: the same word can repeat, the position is the identity
					key={`${index}-${word}`}
					style={index === current ? styles.now : undefined}
				>
					<Text
						allowFontScaling={false}
						style={[styles.question, index > current && styles.upcoming]}
					>
						{word}
					</Text>
				</View>
			))}
		</View>
	);
}

/**
 * The child's question over the first picture. With the narrator's audio it plays, the bed ducks
 * as under any voice, and ~400 ms after it ends the card lets go; without audio it shows for
 * 2.5 s. `gateKey` is this opening's key in `question-gate`.
 */
export function QuestionCard({
	audio,
	gateKey,
	question,
}: {
	audio: NarrationAudio | null;
	gateKey: string;
	question: string;
}) {
	const calm = useCalm();
	const fading = useGate((s) => s.key === gateKey && s.phase === "fading");
	const style = useFade(fading);
	const player = useAudioPlayer(audio?.url ?? null, {
		updateInterval: AUDIO_TICK_MS,
	});
	const heard = useAudioPlayerStatus(player);
	const { currentTime, didJustFinish, duration, isLoaded } = heard;
	const letGo = useCallback(
		() => useGate.getState().finish(gateKey, calm ? 0 : FADE_MS),
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
	return (
		<Animated.View pointerEvents="box-none" style={[styles.root, style]}>
			<Scrim strength={SCRIM_QUESTION} />
			<View pointerEvents="none" style={styles.card} testID="question-card">
				<View style={styles.badge}>
					<Text allowFontScaling={false} style={styles.mark}>
						?
					</Text>
				</View>
				<Words current={current} words={words} />
			</View>
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
	asked: {
		color: colors.inkNavy,
		fontFamily: fonts.label,
		fontSize: 13,
		lineHeight: 16,
		opacity: 0.7,
	},
	badge: {
		alignItems: "center",
		backgroundColor: colors.sun,
		borderRadius: BADGE / 2,
		height: BADGE,
		justifyContent: "center",
		width: BADGE,
	},
	card: {
		alignItems: "center",
		backgroundColor: colors.cream,
		borderRadius: 36,
		gap: 10,
		maxWidth: 560,
		paddingHorizontal: 30,
		paddingVertical: 24,
		width: "78%",
	},
	go: {
		alignSelf: "center",
		height: 60,
		marginTop: 12,
		paddingHorizontal: 40,
	},
	mark: { color: colors.inkNavy, fontFamily: fonts.heavy, fontSize: 28 },
	now: { backgroundColor: colors.sun, borderRadius: 10, paddingHorizontal: 8 },
	question: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: 36,
		lineHeight: 42,
		textAlign: "center",
	},
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
	title: {
		color: colors.inkNavy,
		fontFamily: fonts.heavy,
		fontSize: 22,
		lineHeight: 28,
		paddingBottom: 4,
		textAlign: "center",
	},
	upcoming: { opacity: 0.55 },
	words: {
		alignItems: "center",
		columnGap: 8,
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
	},
});
