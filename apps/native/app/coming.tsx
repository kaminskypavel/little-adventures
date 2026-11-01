import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Plate } from "@little-adventures/native-ui/plate";
import { Screen } from "@little-adventures/native-ui/screen";
import { ToggleCard } from "@little-adventures/native-ui/toggle-card";
import { colors } from "@little-adventures/native-ui/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import {
	grownUpOptions,
	useChild,
	useGrownUpPhoto,
	useSaveProfile,
} from "@/src/data/profile-queries";
import type { Profile } from "@/src/data/types";

// Round 7 04b at 0.72 scale: portrait 96 px = 133 pt with a 4 px = 5.5 pt border.
const PORTRAIT = 133;
const BORDER = 5.5;
const LINE = { opacity: 0.92 } as const;
const ICON_SIZE = 54;
const ICON_OPACITY = 0.4;
// The face fades in over 200 ms; the stand-in icon fades out with it.
const FACE_FADE_MS = 200;
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

type Who = "grownUp" | "puppy" | null;

function saved({ grownUp, puppy }: Profile): Who {
	if (grownUp) {
		return "grownUp";
	}
	return puppy ? "puppy" : null;
}

function Coming({ profile }: { profile: Profile }) {
	const router = useRouter();
	// One companion: the grown-up or the puppy. Nothing is picked on a first run.
	const [who, setWho] = useState<Who>(saved(profile));
	const client = useQueryClient();
	const saveProfile = useSaveProfile();
	// A photo just replaced shows on return: saving it reads the cache again.
	const { data: photo } = useGrownUpPhoto();
	const photoUri = photo ? (photo.faceUrl ?? photo.photoUrl) : null;

	const openPhoto = () =>
		router.push({ params: { replace: "1" }, pathname: "/grownup-photo" });

	const next = async () => {
		if (who === "puppy") {
			await saveProfile({ grownUp: false, puppy: true });
			router.push("/handover");
		} else if (who === "grownUp") {
			// The photo is mandatory for You: without one, the photo step saves the choice.
			if (await client.fetchQuery(grownUpOptions())) {
				await saveProfile({ grownUp: true, puppy: false });
				router.push("/handover");
			} else {
				router.push("/grownup-photo");
			}
		}
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<PrimaryButton disabled={!who} label="Next" onPress={next} />}
			title={"Who's\ncoming along?"}
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
				Pick one to come along
			</ClayText>
			<ToggleCard
				avatar="you"
				on={who === "grownUp"}
				onPress={() => setWho("grownUp")}
				photo={{
					label: photoUri ? "Change your photo" : "Add your photo",
					onPress: openPhoto,
					uri: photoUri,
				}}
				style={styles.you}
				subtitle={
					photoUri
						? "Tap your photo to change"
						: "Tap the circle to add a photo"
				}
				title="You"
			/>
			<ToggleCard
				avatar="puppy"
				on={who === "puppy"}
				onPress={() => setWho("puppy")}
				style={styles.puppy}
				subtitle="Best friend"
				title="Puppy"
			/>
		</Screen>
	);
}

export default function ComingAlong() {
	// The cache asks again while the looks are drawn (see profile-queries.ts).
	const { data } = useChild();
	return data ? <Coming profile={data.profile} /> : null;
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
