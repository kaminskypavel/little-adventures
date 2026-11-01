import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClaySurface } from "@little-adventures/native-ui/clay-surface";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import {
	colors,
	layout,
	radii,
	spacing,
} from "@little-adventures/native-ui/tokens";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { EngineSteps } from "@/src/data/engine-client";
import { stepsLine } from "./steps-line";

/** The engine's spend cap per adventure, shown so the admin knows the worst case. */
const SPEND_CAP_USD = 11;

/**
 * Asked before an admin with live adventures on starts one: it spends real credits. The admin
 * picks live, or the recorded adventure for this one. Drawn inside the app, over the screen.
 */
export function LiveConfirm({
	onCancel,
	onLive,
	onRecorded,
	steps,
}: {
	onCancel: () => void;
	onLive: () => void;
	onRecorded: () => void;
	steps: EngineSteps;
}) {
	const insets = useSafeAreaInsets();
	return (
		<View style={styles.fill}>
			<Pressable
				accessibilityLabel="Cancel"
				onPress={onCancel}
				style={styles.scrim}
			/>
			<View
				pointerEvents="box-none"
				style={[
					styles.sheetWrap,
					{ paddingBottom: Math.max(insets.bottom, layout.dockBottom) },
				]}
			>
				<ClaySurface radius={radii.card} tone="field">
					<View style={styles.sheet}>
						<ClayText accessibilityRole="header" variant="title">
							Start a live adventure?
						</ClayText>
						<ClayText style={styles.note} variant="body">
							{`Live adventures are on, so this one spends real credits, up to $${SPEND_CAP_USD}. ${stepsLine(steps)}`}
						</ClayText>
						<PrimaryButton label="Start live" onPress={onLive} />
						<SecondaryButton
							label="Use the recorded one"
							onPress={onRecorded}
						/>
					</View>
				</ClaySurface>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	fill: { ...StyleSheet.absoluteFill },
	note: { fontSize: 16, lineHeight: 21 },
	scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
	sheet: { gap: spacing.md, padding: spacing.lg },
	sheetWrap: {
		bottom: 0,
		left: 0,
		paddingHorizontal: layout.sideMargin,
		position: "absolute",
		right: 0,
	},
});
