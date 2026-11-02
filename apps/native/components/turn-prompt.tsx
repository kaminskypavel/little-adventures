import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { StarTake } from "@little-adventures/native-ui/star-take";
import {
	colors,
	radii,
	skyPalettes,
} from "@little-adventures/native-ui/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { isAdventurePath, useLandscape, useUpright } from "@/src/orientation";

const STAR_SIZE = 150;
const PHONE = { height: 150, width: 84 } as const;
const TURN_MS = 3200;
const turn = {
	"0%": { transform: [{ rotate: "0deg" }] },
	"20%": { transform: [{ rotate: "0deg" }] },
	"55%": { transform: [{ rotate: "-90deg" }] },
	"85%": { transform: [{ rotate: "-90deg" }] },
	"100%": { transform: [{ rotate: "0deg" }] },
};

/**
 * The web cannot turn the phone by itself, so while an adventure screen is on top and the window
 * is upright it asks for the turn. It goes by itself once the window is wider than tall, and
 * "Play it upright" keeps the portrait layouts for the rest of the visit.
 */
export function TurnPrompt() {
	const pathname = usePathname();
	const landscape = useLandscape();
	const upright = useUpright((s) => s.upright);
	const playUpright = useUpright((s) => s.play);
	const calm = useCalm();

	if (
		Platform.OS !== "web" ||
		landscape ||
		upright ||
		!isAdventurePath(pathname)
	) {
		return null;
	}
	return (
		<View style={styles.root} testID="turn-prompt">
			<LinearGradient
				colors={skyPalettes.puffy.colors}
				locations={skyPalettes.puffy.locations}
				style={StyleSheet.absoluteFill}
			/>
			<StarTake size={STAR_SIZE} take="wave" />
			<Animated.View
				style={[
					styles.phone,
					calm
						? { transform: [{ rotate: "-90deg" }] }
						: {
								animationDuration: `${TURN_MS}ms`,
								animationIterationCount: "infinite",
								animationName: turn,
								animationTimingFunction: "ease-in-out",
							},
				]}
			>
				<View style={styles.screen} />
			</Animated.View>
			<ClayText align="center" color={colors.cream} variant="headline">
				Turn your phone
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={styles.line}
				variant="label"
			>
				The story looks best sideways.
			</ClayText>
			<PrimaryButton
				label="Play it upright"
				onPress={playUpright}
				style={styles.button}
				tone="sage"
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	button: { alignSelf: "center", marginTop: 14, minWidth: 260 },
	line: { maxWidth: 300 },
	phone: {
		backgroundColor: colors.sageHi,
		borderRadius: radii.chip,
		height: PHONE.height,
		marginVertical: 48,
		padding: 8,
		width: PHONE.width,
	},
	root: {
		alignItems: "center",
		bottom: 0,
		gap: 8,
		justifyContent: "center",
		left: 0,
		paddingHorizontal: 22,
		position: "absolute",
		right: 0,
		top: 0,
		zIndex: 10,
	},
	screen: {
		backgroundColor: colors.deepNavy,
		borderRadius: radii.chip - 8,
		flex: 1,
	},
});
