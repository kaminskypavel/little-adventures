import { ClayText } from "@little-adventures/native-ui/clay-text";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	StarTake,
	type StarTakeName,
} from "@little-adventures/native-ui/star-take";
import { colors, layout, motion } from "@little-adventures/native-ui/tokens";
import {
	VoiceHalo,
	type VoiceHaloState,
} from "@little-adventures/native-ui/voice-halo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenAdminTools } from "@/src/admin/admin-panel-store";
import { PresetQuestions } from "@/src/admin/preset-questions";
import {
	loaderFacts,
	shortQuestion,
	transcribe,
} from "@/src/data/adventure-client";
import { askMicPermission } from "@/src/data/mic-permission";
import { useRecorder } from "@/src/data/recorder";
import { setSpokenFacts, setSpokenQuestion } from "@/src/data/spoken-question";
import { canRecord, heldLongEnough } from "@/src/data/voice-rules";

// Round 2 item 16A, measured on the 390 x 844 design: star on top, the hold button in the
// middle, the words under it, so the button can never cover them.
const STAR_SIZE = 150;
const STAR_TOP = 37;
const SPACE_MIN = 56;
const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;
const MISSED_TILT = -8;
const easeOut = Easing.bezier(...motion.easeOut);

type Hint = "ask" | "missed" | "notQuestion" | "short";

/** 09a Listening: hold the big mic and ask, let go to send. It never records without a press. */
// One element for the life of the app, so the admin sheet does not re-register it every render.
const PRESET_TOOLS = <PresetQuestions />;

export default function Listening() {
	useScreenAdminTools("Listening", PRESET_TOOLS);
	const router = useRouter();
	const { level, start, stop } = useRecorder();
	const calm = useCalm();
	const insets = useSafeAreaInsets();
	// Bumped when the screen loses focus: anything still in flight from before is dropped.
	const session = useRef<number>(0);
	const held = useRef<boolean>(false);
	const recording = useRef<boolean>(false);
	const busy = useRef<boolean>(false);
	const downAt = useRef<number>(0);
	const finishRef = useRef<() => void>(() => undefined);
	const [pressing, setPressing] = useState(false);
	const [thinking, setThinking] = useState(false);
	const [hint, setHint] = useState<Hint>("ask");
	// Ask for the microphone once, up front, so the first hold is not cut by the system dialog.
	// Leaving the screen lets go of the microphone and drops whatever was in flight.
	useFocusEffect(
		useCallback(() => {
			const sid = session.current;
			busy.current = false;
			setThinking(false);
			setPressing(false);
			setHint("ask");
			askMicPermission().then((permission) => {
				if (session.current === sid && !canRecord(permission)) {
					router.dismissTo("/home");
				}
			});
			return () => {
				session.current += 1;
				held.current = false;
				if (recording.current) {
					recording.current = false;
					stop().catch(() => undefined);
				}
			};
		}, [router, stop])
	);

	const finish = useCallback(async () => {
		if (!recording.current) {
			return;
		}
		recording.current = false;
		const sid = session.current;
		setPressing(false);
		if (!heldLongEnough(Date.now() - downAt.current)) {
			await stop().catch(() => undefined);
			if (session.current === sid) {
				setHint("short");
			}
			return;
		}
		busy.current = true;
		setThinking(true);
		let question = "";
		let short = "";
		let isQuestion = true;
		try {
			question = (await transcribe(await stop())).trim();
			if (question) {
				({ isQuestion, short } = await shortQuestion(question));
			}
		} catch {
			// Counts as not heard: the same line as an empty recording.
		}
		if (session.current !== sid) {
			return;
		}
		// Stay here, thinking, until both the words and the short question are in.
		if (question && isQuestion) {
			setSpokenQuestion(question, short);
			// In the background: never awaited, never blocks the check. A newer question wins.
			loaderFacts(question).then((facts) => setSpokenFacts(question, facts));
			router.replace("/verify");
			return;
		}
		// Never record again by itself: the child presses when ready.
		setHint(question ? "notQuestion" : "missed");
		setThinking(false);
		busy.current = false;
	}, [router, stop]);
	finishRef.current = finish;

	const onHoldStart = useCallback(async () => {
		if (busy.current || held.current) {
			return;
		}
		const sid = session.current;
		held.current = true;
		downAt.current = Date.now();
		setPressing(true);
		setHint("ask");
		const permission = await askMicPermission();
		if (session.current !== sid) {
			return;
		}
		if (!(canRecord(permission) && held.current)) {
			// Denied, or let go while the system was asking: nothing is recorded.
			held.current = false;
			setPressing(false);
			return;
		}
		try {
			await start(() => finishRef.current());
		} catch {
			held.current = false;
			setPressing(false);
			setHint("missed");
			return;
		}
		if (session.current !== sid) {
			stop().catch(() => undefined);
			return;
		}
		recording.current = true;
		if (!held.current) {
			finishRef.current();
		}
	}, [start, stop]);

	const onHoldEnd = useCallback(() => {
		held.current = false;
		if (recording.current) {
			finishRef.current();
		} else if (!busy.current) {
			// Let go before the recorder was running: nothing to send.
			setPressing(false);
		}
	}, []);

	const state = haloState(pressing, thinking, hint);
	const missed = state === "missed";

	// The star leans over on a miss and eases upright when the next hold starts. Reduced motion
	// sets the pose without moving.
	const tilt = useSharedValue(0);
	useEffect(() => {
		const to = missed ? MISSED_TILT : 0;
		tilt.set(
			calm ? to : withTiming(to, { duration: motion.enter, easing: easeOut })
		);
	}, [calm, missed, tilt]);
	const tiltStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${tilt.get()}deg` }],
	}));

	return (
		<Screen bodyStyle={styles.body}>
			<View style={{ height: insets.top + STAR_TOP }} />
			<Animated.View pointerEvents="none" style={[styles.star, tiltStyle]}>
				<StarTake hold size={STAR_SIZE} take={takeFor(pressing, thinking)} />
			</Animated.View>
			<View style={styles.space} />
			<VoiceHalo
				level={level}
				onHoldEnd={onHoldEnd}
				onHoldStart={onHoldStart}
				state={state}
			/>
			<View style={styles.space} />
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				variant="headline"
			>
				{titleFor(state, hint)}
			</ClayText>
			<View style={styles.line}>
				<ClayText
					align="center"
					color={colors.cream}
					style={LINE}
					variant="body"
				>
					{lineFor(state, hint)}
				</ClayText>
			</View>
		</Screen>
	);
}

function haloState(
	pressing: boolean,
	thinking: boolean,
	hint: Hint
): VoiceHaloState {
	if (thinking) {
		return "thinking";
	}
	if (pressing) {
		return "recording";
	}
	return hint === "missed" || hint === "notQuestion" ? "missed" : "ready";
}

function takeFor(pressing: boolean, thinking: boolean): StarTakeName {
	if (thinking) {
		return "think";
	}
	return pressing ? "listen" : "idle";
}

function titleFor(state: VoiceHaloState, hint: Hint): string {
	switch (state) {
		case "recording":
			return "I'm listening...";
		case "thinking":
			return "Let me think...";
		case "missed":
			return hint === "notQuestion"
				? "That wasn't a question"
				: "I missed that";
		default:
			return "Ask me anything";
	}
}

/** Thinking has no hint line: the star and the bubbles say it. */
function lineFor(state: VoiceHaloState, hint: Hint): string {
	switch (state) {
		case "recording":
			return "Let go when you're done";
		case "thinking":
			return "";
		case "missed":
			return hint === "notQuestion"
				? "Hold the button and ask a question"
				: "Hold the button and ask again";
		default:
			return hint === "short"
				? "Hold a little longer"
				: "Hold the button and ask";
	}
}

const styles = StyleSheet.create({
	body: {
		alignItems: "center",
		paddingBottom: layout.dockBottom + SPACE_MIN / 2,
		paddingHorizontal: layout.sideMargin,
	},
	// The hint keeps its height while thinking, so nothing moves when it goes.
	line: { height: 26, marginTop: 10 },
	space: { flexBasis: 0, flexGrow: 1, minHeight: SPACE_MIN },
	star: { height: STAR_SIZE, width: STAR_SIZE },
});
