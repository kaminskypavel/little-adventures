import { ClayText } from "@little-adventures/native-ui/clay-text";
import { HoldGate } from "@little-adventures/native-ui/hold-gate";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors } from "@little-adventures/native-ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, StyleSheet } from "react-native";
import { useT } from "@/src/i18n";
import { gateStrings } from "@/src/i18n/strings/gate";

// 17 Grown-ups gate. `?then=settings` opens the phone's Settings for this app instead of
// Grown-ups (the mic, turned off for good), and comes back to where the gate was opened from.
// Round 7 (pt = px / 0.72): line 22 pt under the headline, ring 91 pt under the line.
const LINE_TOP = 22;
const GATE_TOP = 91;

export default function Gate() {
	const router = useRouter();
	const t = useT(gateStrings);
	const { then } = useLocalSearchParams<{ then?: string }>();
	const open = () => {
		if (then === "settings") {
			router.back();
			Linking.openSettings().catch(() => undefined);
			return;
		}
		router.replace("/grownups");
	};

	return (
		<Screen title={t("title")}>
			<ClayText
				align="center"
				color={colors.cream}
				style={styles.line}
				variant="body"
			>
				{t("line")}
			</ClayText>
			<HoldGate
				accessibilityLabel={t("hold")}
				onOpen={open}
				style={styles.gate}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	gate: { marginTop: GATE_TOP },
	line: { fontSize: 21, lineHeight: 26, marginTop: LINE_TOP, opacity: 0.92 },
});
