import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { TextField } from "@little-adventures/native-ui/text-field";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { signOut } from "@/src/auth/auth-client";
import { startRoute } from "@/src/data/adventure-client";
import { trpcClient } from "@/src/data/trpc";

// The same calm layout as the error screen: the star, a headline, one line, then the code.
const STAR_SIZE = 150;
const STAR_TOP = 70;
const TITLE_GAP = 24;
const LINE_GAP = 14;
const FIELD_GAP = 28;
const LINE = { fontSize: 21, lineHeight: 27 } as const;
const REFUSED = "That code did not work. Check it and try again.";

/**
 * A signed-in grown-up outside the private beta: nothing here costs anything. The invite code
 * (in the hackathon submission) lets them in.
 */
export default function Beta() {
	const router = useRouter();
	const [code, setCode] = useState("");
	const [joining, setJoining] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const join = async () => {
		if (!code.trim() || joining) {
			return;
		}
		setJoining(true);
		setError(undefined);
		try {
			await trpcClient.beta.join.mutate({ code });
			router.replace(await startRoute());
		} catch {
			setError(REFUSED);
			setJoining(false);
		}
	};
	const leave = async () => {
		await signOut();
		router.replace("/welcome");
	};

	return (
		<Screen
			dock={
				<>
					<PrimaryButton
						disabled={!code.trim() || joining}
						label={joining ? "Joining..." : "Join"}
						onPress={join}
					/>
					<QuietLink label="Sign out" onPress={leave} />
				</>
			}
		>
			<View pointerEvents="none" style={styles.star}>
				<StarTake size={STAR_SIZE} take="wave" />
			</View>
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				style={styles.title}
				variant="headline"
			>
				{"We're in a small\nprivate beta"}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				Have an invite code? Type it here to come in.
			</ClayText>
			<TextField
				autoCapitalize="none"
				autoCorrect={false}
				error={error}
				label="Invite code"
				onChangeText={(text) => {
					setCode(text);
					setError(undefined);
				}}
				onSubmitEditing={join}
				returnKeyType="go"
				style={styles.field}
				value={code}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	field: { marginTop: FIELD_GAP },
	line: { marginTop: LINE_GAP, paddingHorizontal: spacing.lg },
	star: {
		alignSelf: "center",
		height: STAR_SIZE,
		marginTop: STAR_TOP,
		width: STAR_SIZE,
	},
	title: { marginTop: TITLE_GAP },
});
