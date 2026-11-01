import { ClayText } from "@little-adventures/native-ui/clay-text";
import { colors, layout, spacing } from "@little-adventures/native-ui/tokens";
import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { setLive } from "@/src/data/adventure-client";
import { useMe } from "./use-is-admin";

/** The admin row: "Live adventures" with a switch. Shows what the engine returns; snaps back on error. */
export function LiveRow() {
	const me = useMe();
	const [value, setValue] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);
	const [failed, setFailed] = useState(false);
	const on = value ?? me?.live ?? false;

	const toggle = async (next: boolean) => {
		setSaving(true);
		setFailed(false);
		try {
			setValue((await setLive(next)).live);
		} catch {
			setFailed(true);
		} finally {
			setSaving(false);
		}
	};

	return (
		<View style={styles.row}>
			<View style={styles.text}>
				<ClayText color={colors.cream} variant="label">
					Live adventures
				</ClayText>
				<ClayText color={colors.cream} style={styles.note} variant="body">
					Makes real adventures for this account. Each one costs money.
				</ClayText>
				{failed ? (
					<ClayText
						accessibilityLiveRegion="polite"
						color={colors.cream}
						role="alert"
						variant="fieldError"
					>
						Could not change it. Try again.
					</ClayText>
				) : null}
			</View>
			<Switch
				accessibilityLabel="Live adventures"
				disabled={saving || !me}
				onValueChange={toggle}
				thumbColor={colors.cream}
				trackColor={{ false: colors.toggleOff, true: colors.sun }}
				value={on}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	note: { fontSize: 16, lineHeight: 20, opacity: 0.8 },
	row: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		marginTop: spacing.lg,
		paddingHorizontal: spacing.sm,
	},
	text: { flex: 1, gap: 3 },
});
