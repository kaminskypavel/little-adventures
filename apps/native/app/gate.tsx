import { ClayText } from "@little-adventures/native-ui/clay-text";
import { HoldGate } from "@little-adventures/native-ui/hold-gate";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

// 17 Grown-ups gate. Round 7 (pt = px / 0.72): line 22 pt under the headline,
// ring 91 pt under the line.
const LINE_TOP = 22;
const GATE_TOP = 91;

export default function Gate() {
	const router = useRouter();

	return (
		<Screen title={"For\ngrown-ups"}>
			<ClayText
				align="center"
				color={colors.cream}
				style={styles.line}
				variant="body"
			>
				Hold the button for 3 seconds
			</ClayText>
			<HoldGate
				onOpen={() => router.replace("/grownups")}
				style={styles.gate}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	gate: { marginTop: GATE_TOP },
	line: { fontSize: 21, lineHeight: 26, marginTop: LINE_TOP, opacity: 0.92 },
});
