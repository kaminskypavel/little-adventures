import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getProfile } from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

// Round 7 06 at 0.72 scale: star 180 px = 250 pt at top 104 px, title 34 px = 47 pt at 318 px,
// line 17 px = 24 pt at 372 px.
const STAR = 250;
const TITLE = { fontSize: 47, lineHeight: 51 } as const;
const LINE = { fontSize: 24, lineHeight: 30, opacity: 0.92 } as const;

export default function Handover() {
	const router = useRouter();
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	if (!profile) {
		return null;
	}
	const go = () => {
		router.replace("/home");
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<PrimaryButton label="Let's go" onPress={go} />}
		>
			<View style={styles.star}>
				<StarTake size={STAR} take="jump" />
			</View>
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={[styles.title, TITLE]}
				variant="headline"
			>
				All set!
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="body"
			>
				{`Hand the phone to ${profile.childName}.`}
			</ClayText>
		</Screen>
	);
}

const styles = StyleSheet.create({
	body: { alignItems: "center", paddingTop: 144 },
	line: { marginTop: 24 },
	star: { height: STAR, width: STAR },
	title: { marginTop: 48 },
});
