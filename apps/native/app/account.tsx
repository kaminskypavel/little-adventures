import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { getProfile } from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

const LEAD = { fontSize: 21, lineHeight: 26 } as const;
const NOTE = { opacity: 0.7 } as const;

export default function Account() {
	const router = useRouter();
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	if (!profile) {
		return null;
	}
	const next = () => router.push("/child");

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<PrimaryButton label="Continue with Apple" onPress={next} />
					<SecondaryButton label="Continue with email" onPress={next} />
					<ClayText
						align="center"
						color={colors.cream}
						style={NOTE}
						variant="label"
					>
						Kids, ask a grown-up to help.
					</ClayText>
				</>
			}
			title="Hi, grown-up"
		>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.lead, LEAD]}
				variant="body"
			>
				{`Your account keeps ${profile.childName}'s adventures safe.`}
			</ClayText>
		</Screen>
	);
}

const styles = StyleSheet.create({
	body: { paddingTop: spacing.lg },
	lead: { paddingHorizontal: spacing.md },
});
