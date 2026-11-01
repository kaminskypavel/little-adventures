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

/** The engine's spend cap per adventure, shown so the admin knows the worst case. */
const SPEND_CAP_USD = 11;

/**
 * Asked before an admin starts an adventure with the video clips switch on: video is the costly
 * step. The admin starts with video, or turns video off and starts. Drawn inside the app.
 */
export function VideoConfirm({
	onCancel,
	onNoVideo,
	onVideo,
}: {
	onCancel: () => void;
	onNoVideo: () => void;
	onVideo: () => void;
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
							Make video clips?
						</ClayText>
						<ClayText style={styles.note} variant="body">
							{`Video clips are on. They are the costly part: this adventure can spend up to $${SPEND_CAP_USD}.`}
						</ClayText>
						<PrimaryButton label="Start with video" onPress={onVideo} />
						<SecondaryButton
							label="Turn video off and start"
							onPress={onNoVideo}
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
