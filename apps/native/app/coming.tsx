import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Plate } from "@little-adventures/native-ui/plate";
import { Screen } from "@little-adventures/native-ui/screen";
import { ToggleCard } from "@little-adventures/native-ui/toggle-card";
import { colors } from "@little-adventures/native-ui/tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import {
	getGrownUpPhoto,
	getProfile,
	saveProfile,
} from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

// Round 7 04b at 0.72 scale: portrait 96 px = 133 pt with a 4 px = 5.5 pt border.
const PORTRAIT = 133;
const BORDER = 5.5;
const LINE = { opacity: 0.92 } as const;
const ICON_SIZE = 54;
const ICON_OPACITY = 0.4;
// The face fades in over 200 ms; the stand-in icon fades out with it.
const FACE_FADE_MS = 200;
// While the looks are drawn, the screen asks for the face this often, at most this long.
const POLL_MS = 1500;
const POLL_LIMIT_MS = 60_000;
const iconOut = { from: { opacity: ICON_OPACITY }, to: { opacity: 0 } };

/** The hero circle: a stand-in until the face cutout is there, then the face fades in. */
function Portrait({ faceUrl, name }: { faceUrl?: string; name: string }) {
	const calm = useCalm();
	const [loaded, setLoaded] = useState(false);
	const iconFade = loaded
		? ({
				animationDuration: `${FACE_FADE_MS}ms`,
				animationFillMode: "forwards",
				animationName: iconOut,
			} as const)
		: null;

	return (
		<View accessibilityLabel={name} accessible style={styles.portrait}>
			{calm && loaded ? null : (
				<View style={styles.icon}>
					<Animated.View style={[{ opacity: ICON_OPACITY }, iconFade]}>
						<Icon color={colors.cream} name="user" size={ICON_SIZE} />
					</Animated.View>
				</View>
			)}
			{faceUrl ? (
				<Image
					contentFit="cover"
					onLoad={() => setLoaded(true)}
					source={faceUrl}
					style={StyleSheet.absoluteFill}
					transition={calm ? 0 : FACE_FADE_MS}
				/>
			) : null}
		</View>
	);
}

function Coming({ profile }: { profile: Profile }) {
	const router = useRouter();
	const [grownUp, setGrownUp] = useState(profile.grownUp);
	const [puppy, setPuppy] = useState(profile.puppy);

	const next = async () => {
		await saveProfile({ grownUp, puppy });
		router.push(
			grownUp && !(await getGrownUpPhoto()) ? "/grownup-photo" : "/handover"
		);
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<PrimaryButton label="Next" onPress={next} />}
			title={`Who's coming\nalong?`}
		>
			<Portrait faceUrl={profile.faceUrl} name={profile.childName} />
			<Plate
				label={`${profile.childName}, the hero`}
				style={styles.plate}
				variant="hero"
			/>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="fieldError"
			>
				Pick none, one or both
			</ClayText>
			<ToggleCard
				avatar="you"
				on={grownUp}
				onPress={() => setGrownUp((on) => !on)}
				style={styles.you}
				subtitle="Add a photo"
				title="You"
			/>
			<ToggleCard
				avatar="puppy"
				on={puppy}
				onPress={() => setPuppy((on) => !on)}
				style={styles.puppy}
				subtitle="Best friend"
				title="Puppy"
			/>
		</Screen>
	);
}

export default function ComingAlong() {
	const [profile, setProfile] = useState<Profile | null>(null);

	// Ask again until the face is drawn, the drawing failed, or it takes too long.
	useEffect(() => {
		let stopped = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const startedAt = Date.now();
		const poll = async () => {
			try {
				const next = await getProfile();
				if (stopped) {
					return;
				}
				setProfile(next);
				// Idle: no drawing was started (art is off), so nothing to wait for.
				const settled =
					next.faceUrl !== undefined ||
					next.artStatus === "failed" ||
					next.artStatus === "idle";
				if (settled || Date.now() - startedAt >= POLL_LIMIT_MS) {
					return;
				}
			} catch {
				// Keep asking; a missed answer is not worth showing.
			}
			timer = setTimeout(poll, POLL_MS);
		};
		poll();
		return () => {
			stopped = true;
			clearTimeout(timer);
		};
	}, []);

	return profile ? <Coming profile={profile} /> : null;
}

const styles = StyleSheet.create({
	body: { paddingTop: 5 },
	icon: {
		...StyleSheet.absoluteFill,
		alignItems: "center",
		justifyContent: "center",
	},
	line: { marginTop: 3 },
	plate: { alignSelf: "center", marginTop: 12 },
	portrait: {
		alignSelf: "center",
		backgroundColor: colors.deepNavy,
		borderColor: colors.sand,
		borderRadius: PORTRAIT / 2,
		borderWidth: BORDER,
		height: PORTRAIT,
		overflow: "hidden",
		width: PORTRAIT,
	},
	puppy: { marginTop: 17 },
	you: { marginTop: 22 },
});
