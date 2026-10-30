import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { Plate } from "@little-adventures/native-ui/plate";
import { Screen } from "@little-adventures/native-ui/screen";
import { ToggleCard } from "@little-adventures/native-ui/toggle-card";
import { colors } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { getProfile, saveProfile } from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

// Round 7 04b at 0.72 scale: portrait 96 px = 133 pt with a 4 px = 5.5 pt border.
const PORTRAIT = 133;
const BORDER = 5.5;
const LINE = { opacity: 0.92 } as const;

function Coming({ profile }: { profile: Profile }) {
	const router = useRouter();
	const [grownUp, setGrownUp] = useState(profile.grownUp);
	const [puppy, setPuppy] = useState(profile.puppy);

	const next = async () => {
		await saveProfile({ grownUp, puppy });
		router.push("/handover");
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<PrimaryButton label="Next" onPress={next} />}
			title={`Who's coming\nalong?`}
		>
			<Placeholder icon="user" iconSize={54} style={styles.portrait} />
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

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	return profile ? <Coming profile={profile} /> : null;
}

const styles = StyleSheet.create({
	body: { paddingTop: 5 },
	line: { marginTop: 3 },
	plate: { alignSelf: "center", marginTop: 12 },
	portrait: {
		alignSelf: "center",
		borderColor: colors.sand,
		borderRadius: PORTRAIT / 2,
		borderWidth: BORDER,
		height: PORTRAIT,
		width: PORTRAIT,
	},
	puppy: { marginTop: 17 },
	you: { marginTop: 22 },
});
