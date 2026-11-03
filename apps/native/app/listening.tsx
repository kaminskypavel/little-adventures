import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, layout } from "@little-adventures/native-ui/tokens";
import { VoiceHalo } from "@little-adventures/native-ui/voice-halo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenAdminTools } from "@/src/admin/admin-panel-store";
import { PresetQuestions } from "@/src/admin/preset-questions";
import { useT } from "@/src/i18n";
import { askStrings } from "@/src/i18n/strings/ask";
import { lineFor, takeFor, titleFor } from "@/src/voice/ask-copy";
import { useAsk } from "@/src/voice/use-ask";
import { useMissedTilt } from "@/src/voice/use-tilt";

// Round 2 item 16A, measured on the 390 x 844 design: star on top, the hold button in the
// middle, the words under it, so the button can never cover them.
const STAR_SIZE = 150;
const STAR_TOP = 37;
const SPACE_MIN = 56;
const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;

/** 09a Listening: hold the big mic and ask, let go to send. It never records without a press. */
// One element for the life of the app, so the admin sheet does not re-register it every render.
const PRESET_TOOLS = <PresetQuestions />;

export default function Listening() {
	useScreenAdminTools("Listening", PRESET_TOOLS);
	const t = useT(askStrings);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const ask = useAsk(
		useCallback(() => {
			router.replace("/verify");
		}, [router])
	);
	const { arm, disarm } = ask;

	// Ask for the microphone once, up front, so the first hold is not cut by the system dialog.
	// Leaving the screen lets go of the microphone and drops whatever was in flight.
	useFocusEffect(
		useCallback(() => {
			arm(() => router.dismissTo("/home"));
			return disarm;
		}, [arm, disarm, router])
	);

	const missed = ask.state === "missed";
	const tiltStyle = useMissedTilt(missed);

	return (
		<Screen bodyStyle={styles.body}>
			<View style={{ height: insets.top + STAR_TOP }} />
			<Animated.View pointerEvents="none" style={[styles.star, tiltStyle]}>
				<StarTake
					hold
					size={STAR_SIZE}
					take={takeFor(ask.pressing, ask.thinking)}
				/>
			</Animated.View>
			<View style={styles.space} />
			<VoiceHalo
				level={ask.level}
				onHoldEnd={ask.onHoldEnd}
				onHoldStart={ask.onHoldStart}
				state={ask.state}
			/>
			<View style={styles.space} />
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				variant="headline"
			>
				{titleFor(t, ask.state, ask.hint)}
			</ClayText>
			<View style={styles.line}>
				<ClayText
					align="center"
					color={colors.cream}
					style={LINE}
					variant="body"
				>
					{lineFor(t, ask.state, ask.hint)}
				</ClayText>
			</View>
		</Screen>
	);
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
