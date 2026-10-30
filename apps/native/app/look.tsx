import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { LookTile } from "@little-adventures/native-ui/look-tile";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, motion, select } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { getProfile, saveProfile } from "@/src/data/adventure-client";
import type { Look, Profile } from "@/src/data/types";

// Round 7 05 at 0.72 scale: portrait 164 px = 228 pt with a 5 px = 7 pt border.
const PORTRAIT = 228;
const BORDER = 7;
const REDRAW_MS = 600;
const looks: { label: string; value: Look }[] = [
	{ label: "Clay", value: "clay" },
	{ label: "Felt", value: "felt" },
	{ label: "Wood", value: "wood" },
];

function LookScreen({ profile }: { profile: Profile }) {
	const router = useRouter();
	const calm = useCalm();
	const [look, setLook] = useState<Look>(profile.look);
	const fade = useSharedValue(1);
	const portrait = useAnimatedStyle(() => ({ opacity: fade.value }));

	const pick = (value: Look) => {
		setLook(value);
		saveProfile({ look: value });
	};
	// Mock redraw: the portrait fades out and back in over 600 ms (one 200 ms fade when calm).
	const redraw = () => {
		fade.value = calm
			? withSequence(
					withTiming(0, { duration: 0 }),
					withTiming(1, { duration: motion.reducedReveal })
				)
			: withSequence(
					withTiming(0, { duration: REDRAW_MS / 2 }),
					withTiming(1, { duration: REDRAW_MS / 2 })
				);
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<PrimaryButton
						label={`Yes, that's ${profile.childName}`}
						onPress={() => router.push("/coming")}
					/>
					<SecondaryButton label="Draw again" onPress={redraw} />
				</>
			}
			title={`Is this ${profile.childName}?`}
		>
			<Animated.View
				accessibilityLabel={`${profile.childName}, drawn as a ${look}`}
				accessibilityRole="image"
				style={[styles.portrait, portrait]}
			>
				<Placeholder
					icon="user"
					iconSize={90}
					style={StyleSheet.absoluteFill}
				/>
			</Animated.View>
			<ClayText
				align="center"
				color={colors.cream}
				style={styles.label}
				variant="label"
			>
				Pick a look
			</ClayText>
			<View style={styles.looks}>
				{looks.map((item) => (
					<LookTile
						key={item.value}
						label={item.label}
						onPress={() => pick(item.value)}
						picture={null}
						selected={look === item.value}
						style={styles.flex}
					/>
				))}
			</View>
		</Screen>
	);
}

export default function PickLook() {
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	return profile ? <LookScreen profile={profile} /> : null;
}

const styles = StyleSheet.create({
	body: { alignItems: "center", paddingTop: 22 },
	flex: { flex: 1 },
	label: { marginTop: 34, opacity: 0.85 },
	looks: {
		alignSelf: "stretch",
		flexDirection: "row",
		gap: select.lookRowGap,
		marginTop: 10,
	},
	portrait: {
		borderColor: colors.sand,
		borderRadius: PORTRAIT / 2,
		borderWidth: BORDER,
		height: PORTRAIT,
		overflow: "hidden",
		width: PORTRAIT,
	},
});
