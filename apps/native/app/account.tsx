import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { GoogleMark } from "@little-adventures/native-ui/google-mark";
import { Screen } from "@little-adventures/native-ui/screen";
import { TextField } from "@little-adventures/native-ui/text-field";
import { colors, layout, spacing } from "@little-adventures/native-ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import {
	redeemVerifier,
	sendCode,
	signInWithGoogle,
	verifyCode,
} from "@/src/auth/auth-client";
import { getProfile, isSetUp } from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

type Step = "choose" | "email" | "code";

const LEAD = { fontSize: 21, lineHeight: 26 } as const;
const QUIET = { opacity: 0.7 } as const;
const CODE_LENGTH = 6;
const CODE_SPACING = 10;
const CODE_STYLE = { letterSpacing: CODE_SPACING } as const;
const LOOKS_LIKE_EMAIL = /^\S+@\S+\.\S+$/u;
const NON_DIGITS = /\D/gu;

const GOOGLE_FAILED = "Google did not work. Try again.";
const SEND_FAILED = "That did not send. Try again.";
const CODE_FAILED = "That code did not work. Try again.";
const RESENT = "A new code is on its way.";

type Router = ReturnType<typeof useRouter>;

/** Signed in: a new profile finishes setup first, an existing one goes Home. */
async function goNext(router: Router) {
	router.replace((await isSetUp()) ? "/home" : "/child");
}

/** Small cream text that taps. The kit has no text link yet. */
function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="link"
			onPress={onPress}
			style={styles.link}
		>
			<ClayText
				align="center"
				color={colors.cream}
				style={QUIET}
				variant="label"
			>
				{label}
			</ClayText>
		</Pressable>
	);
}

function AccountSteps({ profile }: { profile: Profile }) {
	const router = useRouter();
	const params = useLocalSearchParams();
	const [step, setStep] = useState<Step>("choose");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [note, setNote] = useState<string | null>(null);
	const busy = useRef<boolean>(false);
	const redeemed = useRef<string | null>(null);

	const address = email.trim();
	const emailOk = LOOKS_LIKE_EMAIL.test(address);
	const codeOk = code.length === CODE_LENGTH;

	// Web preview: Google sends the page back here with the session verifier in the query.
	const query = new URLSearchParams(
		Object.entries(params).map(([key, value]) => [key, String(value)])
	).toString();
	useEffect(() => {
		if (!query.includes("verifier") || redeemed.current === query) {
			return;
		}
		redeemed.current = query;
		redeemVerifier(query).then((ok) => {
			if (ok) {
				goNext(router);
			} else {
				setNote(GOOGLE_FAILED);
			}
		});
	}, [query, router]);

	/** One request at a time: a second tap while one runs does nothing. */
	const run = async (task: () => Promise<void>) => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		setNote(null);
		try {
			await task();
		} finally {
			busy.current = false;
		}
	};

	const google = () =>
		run(async () => {
			const result = await signInWithGoogle();
			if (result === "ok") {
				await goNext(router);
			} else if (result === "failed") {
				setNote(GOOGLE_FAILED);
			}
		});

	const send = () =>
		run(async () => {
			if (!emailOk) {
				return;
			}
			if (await sendCode(address)) {
				setCode("");
				setStep("code");
			} else {
				setNote(SEND_FAILED);
			}
		});

	const resend = () =>
		run(async () => {
			setNote((await sendCode(address)) ? RESENT : SEND_FAILED);
		});

	const signIn = () =>
		run(async () => {
			if (!codeOk) {
				return;
			}
			if (await verifyCode(address, code)) {
				await goNext(router);
			} else {
				setNote(CODE_FAILED);
			}
		});

	const changeEmail = () => {
		setCode("");
		setNote(null);
		setStep("email");
	};

	if (step === "email") {
		return (
			<Screen
				bodyStyle={styles.fieldBody}
				dock={
					<PrimaryButton
						disabled={!emailOk}
						label="Send me a code"
						onPress={send}
						tone={emailOk ? "sun" : "off"}
					/>
				}
				title="Hi, grown-up"
			>
				<TextField
					autoCapitalize="none"
					autoComplete="email"
					autoCorrect={false}
					autoFocus
					error={note ?? undefined}
					key="email"
					keyboardType="email-address"
					label="Email"
					long
					onChangeText={(text) => {
						setEmail(text);
						setNote(null);
					}}
					onSubmitEditing={send}
					returnKeyType="send"
					textContentType="emailAddress"
					value={email}
				/>
			</Screen>
		);
	}

	if (step === "code") {
		return (
			<Screen
				bodyStyle={styles.fieldBody}
				dock={
					<>
						<PrimaryButton
							disabled={!codeOk}
							label="Sign in"
							onPress={signIn}
							tone={codeOk ? "sun" : "off"}
						/>
						<View>
							<QuietLink label="Send a new code" onPress={resend} />
							<QuietLink label="Use a different email" onPress={changeEmail} />
						</View>
					</>
				}
				title="Hi, grown-up"
			>
				<TextField
					autoComplete="one-time-code"
					autoCorrect={false}
					error={note ?? undefined}
					inputStyle={CODE_STYLE}
					key="code"
					keyboardType="number-pad"
					label="Code"
					maxLength={CODE_LENGTH}
					onChangeText={(text) => {
						const digits = text.replace(NON_DIGITS, "");
						setCode(digits);
						setNote(null);
						if (digits.length === CODE_LENGTH) {
							Keyboard.dismiss();
						}
					}}
					textContentType="oneTimeCode"
					value={code}
				/>
			</Screen>
		);
	}

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<PrimaryButton
						label="Continue with Google"
						leading={<GoogleMark />}
						onPress={google}
					/>
					<SecondaryButton
						label="Continue with email"
						onPress={() => {
							setNote(null);
							setStep("email");
						}}
					/>
					<ClayText
						align="center"
						color={colors.cream}
						style={QUIET}
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

export default function Account() {
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	return profile ? <AccountSteps profile={profile} /> : null;
}

const styles = StyleSheet.create({
	body: { paddingTop: spacing.lg },
	fieldBody: { paddingTop: spacing.xl },
	lead: { paddingHorizontal: spacing.md },
	link: {
		alignItems: "center",
		justifyContent: "center",
		minHeight: layout.minTarget - spacing.lg,
	},
	note: { marginTop: spacing.lg },
});
