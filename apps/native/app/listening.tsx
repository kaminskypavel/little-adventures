import { ClayText } from "@little-adventures/native-ui/clay-text";
import {
	ListenGlow,
	listenGlow,
} from "@little-adventures/native-ui/listen-glow";
import { MicDone } from "@little-adventures/native-ui/mic-done";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	StarTake,
	type StarTakeName,
} from "@little-adventures/native-ui/star-take";
import { colors, layout } from "@little-adventures/native-ui/tokens";
import { VoiceWave } from "@little-adventures/native-ui/voice-wave";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { transcribe } from "@/src/data/adventure-client";
import { askMicPermission } from "@/src/data/mic-permission";
import { useRecorder } from "@/src/data/recorder";
import { canRecord } from "@/src/data/voice-rules";

// Round 7 09a at 0.72 scale (px / 0.72), measured from the screen top.
const GLOW_TOP = 61;
const STAR_SIZE = 181;
const STAR_TOP = 56;
const WAVE_TOP = 406;
const WAVE_SIDE = 47;
const TITLE_TOP = 517;
const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;
const LINE_TOP = 578;

/** 09a Listening: the star listens, the wave moves, one big mic says "done". Mic only, no typing. */
export default function Listening() {
	const router = useRouter();
	const { start, stop } = useRecorder();
	const busy = useRef<boolean>(false);
	const finishRef = useRef<() => void>(() => undefined);
	const mounted = useRef<boolean>(true);
	const [thinking, setThinking] = useState(false);
	const [missed, setMissed] = useState(false);
	// The listen take plays once. Dropping to idle for one render and asking for listen again
	// queues it behind the one that is playing, so the star never stops listening.
	const [rest, setRest] = useState(false);
	const queueAgain = useCallback(() => setRest(true), []);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	useEffect(() => {
		setRest(true);
	}, []);
	useEffect(() => {
		if (rest) {
			setRest(false);
		}
	}, [rest]);

	const listen = useCallback(async () => {
		const permission = await askMicPermission();
		if (!canRecord(permission)) {
			router.dismissTo("/home");
			return;
		}
		try {
			await start(() => finishRef.current());
		} catch {
			setMissed(true);
		}
	}, [router, start]);

	const finish = useCallback(async () => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		setThinking(true);
		let question = "";
		try {
			question = (await transcribe(await stop())).trim();
		} catch {
			// Counts as not heard: the same retry line as an empty recording.
		}
		if (!mounted.current) {
			return;
		}
		if (question) {
			router.replace({ params: { question }, pathname: "/verify" });
			return;
		}
		setMissed(true);
		setThinking(false);
		busy.current = false;
		await listen();
	}, [listen, router, stop]);
	finishRef.current = finish;

	const recordingStarted = useRef<boolean>(false);
	useEffect(() => {
		if (!recordingStarted.current) {
			recordingStarted.current = true;
			listen();
		}
	}, [listen]);

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<MicDone disabled={thinking} onPress={finish} />}
		>
			<View pointerEvents="none" style={styles.hero}>
				<View style={styles.group}>
					<ListenGlow />
					<View style={styles.star}>
						<StarTake
							onTakeEnd={queueAgain}
							size={STAR_SIZE}
							take={takeFor(rest, thinking)}
						/>
					</View>
				</View>
			</View>
			<VoiceWave style={[styles.wave, thinking && styles.hidden]} />
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={styles.title}
				variant="headline"
			>
				{thinking ? "Let me think..." : "I'm listening..."}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				{lineFor(thinking, missed)}
			</ClayText>
		</Screen>
	);
}

function takeFor(rest: boolean, thinking: boolean): StarTakeName {
	if (rest) {
		return "idle";
	}
	return thinking ? "think" : "listen";
}

function lineFor(thinking: boolean, missed: boolean): string {
	if (thinking) {
		return "";
	}
	return missed
		? "I missed that. Say it again?"
		: "Tap the mic when you're done";
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
