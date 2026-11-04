import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
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
import { guestRoute } from "@/src/auth/try-as-guest";
import { startRoute } from "@/src/data/adventure-client";
import { trpcClient } from "@/src/data/trpc";
import { useT } from "@/src/i18n";
import { betaStrings } from "@/src/i18n/strings/beta";

// The same calm layout as the error screen: the star, a headline, one line, then the code.
const STAR_SIZE = 104;
const STAR_TOP = 44;
const TITLE_GAP = 24;
const LINE_GAP = 14;
const FIELD_GAP = 20;
const LINE = { fontSize: 21, lineHeight: 27 } as const;

/**
 * A signed-in grown-up outside the private beta: nothing here costs anything. The invite code
 * (in the hackathon submission) lets them in.
 */
export default function Beta() {
	const router = useRouter();
	const t = useT(betaStrings);
	const [code, setCode] = useState("");
	const [joining, setJoining] = useState(false);
	const [guesting, setGuesting] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const join = async () => {
		if (!code.trim() || joining || guesting) {
			return;
		}
		setJoining(true);
		setError(undefined);
		try {
			await trpcClient.beta.join.mutate({ code });
			router.replace(await startRoute());
		} catch {
			setError(t("refused"));
			setJoining(false);
		}
	};
	const tryAsGuest = async () => {
		if (joining || guesting) {
			return;
		}
		setGuesting(true);
		setError(undefined);
		// No sign-out first: that would unmount this screen and land on Welcome. The guest
		// sign-in replaces the session in place.
		const route = await guestRoute();
		if (route) {
			router.replace(route);
		} else {
			setError(t("guestFailed"));
			setGuesting(false);
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
						disabled={!code.trim() || joining || guesting}
						label={joining ? t("joining") : t("join")}
						onPress={join}
					/>
					<SecondaryButton
						disabled={joining || guesting}
						label={t("guest")}
						onPress={tryAsGuest}
					/>
					<QuietLink label={t("signOut")} onPress={leave} />
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
				{t("title")}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[LINE, styles.line]}
				variant="body"
			>
				{t("line")}
			</ClayText>
			<TextField
				autoCapitalize="none"
				autoCorrect={false}
				error={error}
				label={t("code")}
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
