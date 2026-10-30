import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, motion, spacing } from "@little-adventures/native-ui/tokens";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import {
	launchCameraAsync,
	launchImageLibraryAsync,
	requestCameraPermissionsAsync,
} from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { getProfile, saveProfile } from "@/src/data/adventure-client";
import { uploadChildPhoto } from "@/src/data/photo-upload";
import type { Profile } from "@/src/data/types";

// Round 7 04 at 0.72 scale: ring 170 px = 236 pt with a 64 px = 89 pt camera, line 15 px = 21 pt.
const RING = 236;
const CAMERA = 89;
const RING_FILL = 0.14;
const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;
// The check pops in over one release spring, then the screen moves on.
const ADVANCE_MS = 600;
const POP_FROM = 0.6;
const overshoot = cubicBezier(...motion.overshoot);

const CAMERA_OFF = "Camera is off. Choose a photo instead.";
const UPLOAD_FAILED = "That did not upload. Try again.";

const popIn = {
	from: { opacity: 0, transform: [{ scale: POP_FROM }] },
	to: { opacity: 1, transform: [{ scale: 1 }] },
};
const fadeIn = { from: { opacity: 0 }, to: { opacity: 1 } };

type Source = "camera" | "library";

const pickerOptions = {
	allowsEditing: false,
	mediaTypes: "images",
	quality: 1,
} as const;

/** The picked image's uri, "denied" when the camera is off, null when the picker was closed. */
async function pick(source: Source): Promise<string | "denied" | null> {
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

function PhotoRing({ done }: { done: boolean }) {
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

	return (
		<View style={styles.ring}>
			<View style={[StyleSheet.absoluteFill, styles.fill]} />
			{done ? (
				<Animated.View style={pop}>
					<Icon color={colors.cream} name="check" size={CAMERA} />
				</Animated.View>
			) : (
				<Icon color={colors.cream} name="camera" size={CAMERA} />
			)}
		</View>
	);
}

function PhotoStep({ profile }: { profile: Profile }) {
	const router = useRouter();
	const [done, setDone] = useState(false);
	const [note, setNote] = useState<string | null>(null);
	// Taps are ignored while a photo is on its way, and once it has gone.
	const busy = useRef<boolean>(false);

	useEffect(() => {
		if (!done) {
			return;
		}
		const timer = setTimeout(() => router.push("/look"), ADVANCE_MS);
		return () => clearTimeout(timer);
	}, [done, router]);

	const choose = async (source: Source) => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		setNote(null);
		try {
			const uri = await pick(source);
			if (uri === "denied") {
				setNote(CAMERA_OFF);
			} else if (uri) {
				const photoKey = await uploadChildPhoto(uri);
				await saveProfile({ hasPhoto: true, photoKey });
				notificationAsync(NotificationFeedbackType.Success);
				setDone(true);
				return;
			}
		} catch {
			setNote(UPLOAD_FAILED);
		}
		busy.current = false;
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<PrimaryButton
						icon="camera"
						label="Take a photo"
						onPress={() => choose("camera")}
					/>
					<SecondaryButton
						icon="image"
						label="Choose a photo"
						onPress={() => choose("library")}
					/>
				</>
			}
			title={`Add a photo\nof ${profile.childName}`}
		>
			<PhotoRing done={done} />
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="body"
			>
				{`Only used to draw storybook ${profile.childName}. Never shown or shared.`}
			</ClayText>
			{note ? (
				<ClayText
					accessibilityLiveRegion="polite"
					align="center"
					color={colors.cream}
					style={styles.note}
					variant="fieldError"
				>
					{note}
				</ClayText>
			) : null}
		</Screen>
	);
}

export default function Photo() {
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	return profile ? <PhotoStep profile={profile} /> : null;
}

const styles = StyleSheet.create({
	body: { alignItems: "center", paddingTop: 44 },
	fill: {
		backgroundColor: colors.cream,
		borderRadius: RING / 2,
		opacity: RING_FILL,
	},
	line: { marginTop: 45, paddingHorizontal: 14 },
	note: { marginTop: spacing.md, paddingHorizontal: spacing.md },
	ring: {
		alignItems: "center",
		borderRadius: RING / 2,
		height: RING,
		justifyContent: "center",
		width: RING,
	},
});
