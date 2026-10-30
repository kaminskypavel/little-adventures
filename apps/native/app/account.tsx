import { zodResolver } from "@hookform/resolvers/zod";
import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { GoogleMark } from "@little-adventures/native-ui/google-mark";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { TextField } from "@little-adventures/native-ui/text-field";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import {
	type CodeForm,
	codeSchema,
	type EmailForm,
	emailSchema,
} from "@little-adventures/validation/sign-in";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet, View } from "react-native";
import {
	redeemVerifier,
	sendCode,
	signInWithGoogle,
	verifyCode,
} from "@/src/auth/auth-client";
import { isSetUp } from "@/src/data/adventure-client";

type Step = "choose" | "email" | "code";

const LEAD = { fontSize: 21, lineHeight: 26 } as const;
const QUIET = { opacity: 0.7 } as const;
const CODE_LENGTH = 6;
const CODE_SPACING = 10;
const CODE_STYLE = { letterSpacing: CODE_SPACING } as const;
const NON_DIGITS = /\D/gu;

const GOOGLE_FAILED = "Google did not work. Try again.";
const SEND_FAILED = "That did not send. Try again.";
const CODE_FAILED = "That code did not work. Try again.";
const RESENT = "A new code is on its way.";

type Router = ReturnType<typeof useRouter>;

/** Signed in: no child yet goes to the grown-up welcome, an existing one goes Home. */
async function goNext(router: Router) {
	router.replace((await isSetUp()) ? "/home" : "/hello");
}

export default function Account() {
	const router = useRouter();
	const params = useLocalSearchParams();
	const [step, setStep] = useState<Step>("choose");
	const [address, setAddress] = useState("");
	const [note, setNote] = useState<string | null>(null);
	const busy = useRef<boolean>(false);
	const redeemed = useRef<string | null>(null);

	const emailForm = useForm<EmailForm>({
		defaultValues: { email: "" },
		mode: "onTouched",
		resolver: zodResolver(emailSchema),
	});
	const codeForm = useForm<CodeForm>({
		defaultValues: { code: "" },
		mode: "onTouched",
		resolver: zodResolver(codeSchema),
	});

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

	const send = emailForm.handleSubmit(({ email }) =>
		run(async () => {
			if (await sendCode(email)) {
				setAddress(email);
				codeForm.reset();
				setStep("code");
			} else {
				setNote(SEND_FAILED);
			}
		})
	);

	const resend = () =>
		run(async () => {
			setNote((await sendCode(address)) ? RESENT : SEND_FAILED);
		});

	const signIn = codeForm.handleSubmit(({ code }) =>
		run(async () => {
			if (await verifyCode(address, code)) {
				await goNext(router);
			} else {
				setNote(CODE_FAILED);
			}
		})
	);

	const changeEmail = () => {
		codeForm.reset();
		setNote(null);
		setStep("email");
	};

	if (step === "email") {
		return (
			<Screen
				bodyStyle={styles.fieldBody}
				dock={<PrimaryButton label="Send me a code" onPress={send} />}
				title="Hi, grown-up"
			>
				<Controller
					control={emailForm.control}
					name="email"
					render={({ field, fieldState }) => (
						<TextField
							autoCapitalize="none"
							autoComplete="email"
							autoCorrect={false}
							autoFocus
							error={fieldState.error?.message ?? note ?? undefined}
							key="email"
							keyboardType="email-address"
							label="Email"
							long
							onBlur={field.onBlur}
							onChangeText={(text) => {
								field.onChange(text);
								setNote(null);
							}}
							onSubmitEditing={send}
							returnKeyType="send"
							textContentType="emailAddress"
							value={field.value}
						/>
					)}
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
						<PrimaryButton label="Sign in" onPress={signIn} />
						<View>
							<QuietLink label="Send a new code" onPress={resend} />
							<QuietLink label="Use a different email" onPress={changeEmail} />
						</View>
					</>
				}
				title="Hi, grown-up"
			>
				<Controller
					control={codeForm.control}
					name="code"
					render={({ field, fieldState }) => (
						<TextField
							autoComplete="one-time-code"
							autoCorrect={false}
							error={fieldState.error?.message ?? note ?? undefined}
							inputStyle={CODE_STYLE}
							key="code"
							keyboardType="number-pad"
							label="Code"
							maxLength={CODE_LENGTH}
							onBlur={field.onBlur}
							onChangeText={(text) => {
								const digits = text.replace(NON_DIGITS, "");
								field.onChange(digits);
								setNote(null);
								if (digits.length === CODE_LENGTH) {
									Keyboard.dismiss();
								}
							}}
							textContentType="oneTimeCode"
							value={field.value}
						/>
					)}
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
				Your account keeps your child's adventures safe.
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

const styles = StyleSheet.create({
	body: { paddingTop: spacing.lg },
	fieldBody: { paddingTop: spacing.xl },
	lead: { paddingHorizontal: spacing.md },
	note: { marginTop: spacing.lg },
});
