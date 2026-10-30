import { ClayText } from "@little-adventures/native-ui/clay-text";
import {
	ListenGlow,
	listenGlow,
} from "@little-adventures/native-ui/listen-glow";
import { MicDone } from "@little-adventures/native-ui/mic-done";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, layout } from "@little-adventures/native-ui/tokens";
import { VoiceWave } from "@little-adventures/native-ui/voice-wave";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { transcribe } from "@/src/data/adventure-client";

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
	const sent = useRef<boolean>(false);
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

	const done = useCallback(() => {
		if (sent.current) {
			return;
		}
		sent.current = true;
		transcribe()
			.then((question) =>
				router.replace({ params: { question }, pathname: "/verify" })
			)
			.catch(() => {
				sent.current = false;
			});
	}, [router]);

	return (
		<Screen bodyStyle={styles.body} dock={<MicDone onPress={done} />}>
			<View pointerEvents="none" style={styles.hero}>
				<View style={styles.group}>
					<ListenGlow />
					<View style={styles.star}>
						<StarTake
							onTakeEnd={queueAgain}
							size={STAR_SIZE}
							take={rest ? "idle" : "listen"}
						/>
					</View>
				</View>
			</View>
			<VoiceWave style={styles.wave} />
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={styles.title}
				variant="headline"
			>
				{"I'm listening..."}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				{"Tap the mic when you're done"}
			</ClayText>
		</Screen>
	);
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
