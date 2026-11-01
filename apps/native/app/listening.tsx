import { ClaySurface } from "@little-adventures/native-ui/clay-surface";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import {
	ListenGlow,
	listenGlow,
} from "@little-adventures/native-ui/listen-glow";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	StarTake,
	type StarTakeName,
} from "@little-adventures/native-ui/star-take";
import { colors, layout } from "@little-adventures/native-ui/tokens";
import { VoiceWave } from "@little-adventures/native-ui/voice-wave";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { transcribe } from "@/src/data/adventure-client";
import { askMicPermission } from "@/src/data/mic-permission";
import { useRecorder } from "@/src/data/recorder";
import { setSpokenQuestion } from "@/src/data/spoken-question";
import { canRecord, heldLongEnough } from "@/src/data/voice-rules";

// Round 7 09a at 0.72 scale (px / 0.72), measured from the screen top.
const GLOW_TOP = 61;
const STAR_SIZE = 181;
const STAR_TOP = 56;
const WAVE_TOP = 406;
const WAVE_SIDE = 47;
const TITLE_TOP = 517;
const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;
const LINE_TOP = 578;

// The hold-to-talk button is the old "I'm done" mic: a 96 px sun circle, 44 px mic, 4 px ring.
const MIC_SIZE = 133;
const MIC_ICON = 61;
const RING_WIDTH = 5.5;
const RING_MS = 2000;
const RING_REACH = 1.55;
const RING_START = 0.8;
const RING_STILL = 0.5;
// The finger may wander while it holds: it only lets go when it lifts.
const KEEP_HOLDING = { bottom: 400, left: 400, right: 400, top: 400 } as const;

const ring = {
	from: { opacity: RING_START, transform: [{ scale: 1 }] },
	to: { opacity: 0, transform: [{ scale: RING_REACH }] },
};

type Hint = "ask" | "missed" | "short";

/** 09a Listening: hold the big mic and ask, let go to send. It never records without a press. */
export default function Listening() {
	const router = useRouter();
	const { start, stop } = useRecorder();
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
	// The listen take plays once. Dropping to idle for one render and asking for listen again
	// queues it behind the one that is playing, so the star never stops listening.
	const [rest, setRest] = useState(false);
	const queueAgain = useCallback(() => setRest(true), []);

	useEffect(() => {
		setRest(true);
	}, []);
	useEffect(() => {
		if (rest) {
			setRest(false);
		}
	}, [rest]);

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
		try {
			question = (await transcribe(await stop())).trim();
		} catch {
			// Counts as not heard: the same line as an empty recording.
		}
		if (session.current !== sid) {
			return;
		}
		if (question) {
			setSpokenQuestion(question);
			router.replace("/verify");
			return;
		}
		// Never record again by itself: the child presses when ready.
		setHint("missed");
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

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<HoldMic
					disabled={thinking}
					onHoldEnd={onHoldEnd}
					onHoldStart={onHoldStart}
					pressing={pressing}
				/>
			}
		>
			<View pointerEvents="none" style={styles.hero}>
				<View style={styles.group}>
					<ListenGlow />
					<View style={styles.star}>
						<StarTake
							onTakeEnd={queueAgain}
							size={STAR_SIZE}
							take={takeFor(rest, pressing, thinking)}
						/>
					</View>
				</View>
			</View>
			<VoiceWave style={[styles.wave, !pressing && styles.hidden]} />
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={styles.title}
				variant="headline"
			>
				{titleFor(pressing, thinking)}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				{lineFor(pressing, thinking, hint)}
			</ClayText>
		</Screen>
	);
}

/** Press and hold to talk, let go to send. The ring spreads while it listens. */
function HoldMic({
	disabled,
	onHoldEnd,
	onHoldStart,
	pressing,
}: {
	disabled: boolean;
	onHoldEnd: () => void;
	onHoldStart: () => void;
	pressing: boolean;
}) {
	const calm = useCalm();
	let ringStyle: object = { opacity: 0 };
	if (pressing) {
		ringStyle = calm
			? { opacity: RING_STILL }
			: {
					animationDuration: `${RING_MS}ms`,
					animationIterationCount: "infinite",
					animationName: ring,
					animationTimingFunction: "ease-out",
				};
	}
	return (
		<View style={styles.mic}>
			<Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
			<Pressable
				accessibilityHint="Press and hold, ask your question, then let go"
				accessibilityLabel="Hold to ask"
				accessibilityRole="button"
				disabled={disabled}
				onPressIn={onHoldStart}
				onPressOut={onHoldEnd}
				pressRetentionOffset={KEEP_HOLDING}
				style={[styles.micButton, pressing && styles.micDown]}
			>
				<ClaySurface
					radius={MIC_SIZE / 2}
					style={StyleSheet.absoluteFill}
					tone="sun"
				/>
				<Icon color={colors.inkNavy} name="mic" size={MIC_ICON} />
			</Pressable>
		</View>
	);
}

function takeFor(
	rest: boolean,
	pressing: boolean,
	thinking: boolean
): StarTakeName {
	if (rest) {
		return "idle";
	}
	if (thinking) {
		return "think";
	}
	return pressing ? "listen" : "idle";
}

function titleFor(pressing: boolean, thinking: boolean): string {
	if (thinking) {
		return "Let me think...";
	}
	return pressing ? "I'm listening..." : "Ask me anything";
}

function lineFor(pressing: boolean, thinking: boolean, hint: Hint): string {
	if (thinking) {
		return "";
	}
	if (pressing) {
		return "Let go when you're done";
	}
	if (hint === "short") {
		return "Hold a little longer";
	}
	return hint === "missed"
		? "I missed that. Hold and ask again"
		: "Hold the button and ask";
}

const styles = StyleSheet.create({
	body: { paddingHorizontal: 0 },
	group: { height: listenGlow.height, width: listenGlow.width },
	hero: {
		alignItems: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: GLOW_TOP,
	},
	hidden: { opacity: 0 },
	line: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
		top: LINE_TOP,
	},
	mic: { alignSelf: "center", height: MIC_SIZE, width: MIC_SIZE },
	micButton: {
		alignItems: "center",
		borderRadius: MIC_SIZE / 2,
		height: MIC_SIZE,
		justifyContent: "center",
		width: MIC_SIZE,
	},
	micDown: { transform: [{ scale: 0.97 }, { translateY: 4 }] },
	ring: {
		borderColor: colors.sun,
		borderRadius: MIC_SIZE / 2,
		borderWidth: RING_WIDTH,
		height: MIC_SIZE,
		position: "absolute",
		width: MIC_SIZE,
	},
	star: {
		height: STAR_SIZE,
		left: (listenGlow.width - STAR_SIZE) / 2,
		position: "absolute",
		top: STAR_TOP,
		width: STAR_SIZE,
	},
	title: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
		top: TITLE_TOP,
	},
	wave: {
		left: WAVE_SIDE,
		position: "absolute",
		right: WAVE_SIDE,
		top: WAVE_TOP,
	},
});
