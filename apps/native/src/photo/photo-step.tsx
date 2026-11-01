import { Icon } from "@little-adventures/native-ui/icons";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { colors, motion } from "@little-adventures/native-ui/tokens";
import { Image } from "expo-image";
import {
	launchCameraAsync,
	launchImageLibraryAsync,
	requestCameraPermissionsAsync,
} from "expo-image-picker";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";

// Round 7 04 at 0.72 scale: ring 170 px = 236 pt with a 64 px = 89 pt camera, line 15 px = 21 pt.
const RING = 236;
const CAMERA = 89;
const RING_FILL = 0.14;
const BADGE = 56;
export const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;
// The check pops in over one release spring, then the screen moves on.
export const ADVANCE_MS = 600;
const POP_FROM = 0.6;
const overshoot = cubicBezier(...motion.overshoot);

export const CAMERA_OFF = "Camera is off. Choose a photo instead.";
export const UPLOAD_FAILED = "That did not upload. Try again.";

const popIn = {
	from: { opacity: 0, transform: [{ scale: POP_FROM }] },
	to: { opacity: 1, transform: [{ scale: 1 }] },
};
const fadeIn = { from: { opacity: 0 }, to: { opacity: 1 } };

export type Source = "camera" | "library";

const pickerOptions = {
	allowsEditing: false,
	mediaTypes: "images",
	quality: 1,
} as const;

/** The picked image's uri, "denied" when the camera is off, null when the picker was closed. */
export async function pick(source: Source): Promise<string | "denied" | null> {
	// The web preview has no camera; "Take a photo" opens the file picker there.
	if (source === "camera" && Platform.OS !== "web") {
		try {
			if (!(await requestCameraPermissionsAsync()).granted) {
				return "denied";
			}
			const shot = await launchCameraAsync(pickerOptions);
			return shot.canceled ? null : shot.assets[0].uri;
		} catch {
			// No camera on this device (a simulator, for example).
			return "denied";
		}
	}
	const chosen = await launchImageLibraryAsync(pickerOptions);
	return chosen.canceled ? null : chosen.assets[0].uri;
}

/**
 * The ring: a camera until a photo is picked, then the photo itself (a local
 * uri just picked, or the saved photo's url) with a check once it is uploaded.
 */
export function PhotoRing({
	done,
	photoUri,
	size = RING,
}: {
	done: boolean;
	photoUri?: string | null;
	/** Width and height; the question under the grown-up's photo shrinks it. */
	size?: number;
}) {
	const calm = useCalm();
	const pop = calm
		? ({
				animationDuration: `${motion.reducedReveal}ms`,
				animationName: fadeIn,
			} as const)
		: ({
				animationDuration: `${motion.release}ms`,
				animationFillMode: "backwards",
				animationName: popIn,
				animationTimingFunction: overshoot,
			} as const);

	let content: ReactNode = (
		<Icon color={colors.cream} name="camera" size={CAMERA} />
	);
	if (photoUri) {
		content = (
			<>
				<Image
					accessibilityLabel="Your photo"
					contentFit="cover"
					source={{ uri: photoUri }}
					style={{ borderRadius: size / 2, height: size, width: size }}
				/>
				{done ? (
					<Animated.View style={[styles.badge, pop]}>
						<Icon color={colors.cream} name="check" size={BADGE / 2} />
					</Animated.View>
				) : null}
			</>
		);
	} else if (done) {
		content = (
			<Animated.View style={pop}>
				<Icon color={colors.cream} name="check" size={CAMERA} />
			</Animated.View>
		);
	}

	return (
		<View
			style={[
				styles.ring,
				{ borderRadius: size / 2, height: size, width: size },
			]}
		>
			<View
				style={[
					StyleSheet.absoluteFill,
					styles.fill,
					{ borderRadius: size / 2 },
				]}
			/>
			{content}
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		alignItems: "center",
		backgroundColor: colors.deepNavy,
		borderRadius: BADGE / 2,
		bottom: 4,
		height: BADGE,
		justifyContent: "center",
		position: "absolute",
		right: 4,
		width: BADGE,
	},
	fill: {
		backgroundColor: colors.cream,
		opacity: RING_FILL,
	},
	ring: { alignItems: "center", justifyContent: "center" },
});
