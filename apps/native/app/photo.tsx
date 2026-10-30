import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getProfile, saveProfile } from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

// Round 7 04 at 0.72 scale: ring 170 px = 236 pt with a 64 px = 89 pt camera, line 15 px = 21 pt.
const RING = 236;
const CAMERA = 89;
const RING_FILL = 0.14;
const LINE = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;

export default function Photo() {
	const router = useRouter();
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	if (!profile) {
		return null;
	}
	// Mock: both actions count as a photo taken.
	const done = async () => {
		await saveProfile({ hasPhoto: true });
		router.push("/look");
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<PrimaryButton icon="camera" label="Take a photo" onPress={done} />
					<SecondaryButton icon="image" label="Choose a photo" onPress={done} />
				</>
			}
			title={`Add a photo\nof ${profile.childName}`}
		>
			<View style={styles.ring}>
				<View style={[StyleSheet.absoluteFill, styles.fill]} />
				<Icon color={colors.cream} name="camera" size={CAMERA} />
			</View>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="body"
			>
				{`Only used to draw storybook ${profile.childName}. Never shown or shared.`}
			</ClayText>
		</Screen>
	);
}

const styles = StyleSheet.create({
	body: { alignItems: "center", paddingTop: 44 },
	fill: {
		backgroundColor: colors.cream,
		borderRadius: RING / 2,
		opacity: RING_FILL,
	},
	line: { marginTop: 45, paddingHorizontal: 14 },
	ring: {
		alignItems: "center",
		borderRadius: RING / 2,
		height: RING,
		justifyContent: "center",
		width: RING,
	},
});
