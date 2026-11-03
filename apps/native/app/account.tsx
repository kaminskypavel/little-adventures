import { zodResolver } from "@hookform/resolvers/zod";
import { AppleMark } from "@little-adventures/native-ui/apple-mark";
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
	signInWith,
	verifyCode,
} from "@/src/auth/auth-client";
import { startRoute } from "@/src/data/adventure-client";
import { useT } from "@/src/i18n";
import { accountStrings } from "@/src/i18n/strings/account";
import { useErrorText } from "@/src/i18n/strings/form-errors";

type Step = "choose" | "email" | "code";

const LEAD = { fontSize: 21, lineHeight: 26 } as const;
const QUIET = { opacity: 0.7 } as const;
const CODE_LENGTH = 6;
const CODE_SPACING = 10;
const CODE_STYLE = { letterSpacing: CODE_SPACING } as const;
const NON_DIGITS = /\D/gu;

const PROVIDER_FAILED = {
	apple: "appleFailed",
	google: "googleFailed",
} as const;

type Router = ReturnType<typeof useRouter>;

/** Signed in: no child yet goes to the grown-up welcome, an existing one goes Home. */
async function goNext(router: Router) {
	router.replace(await startRoute());
}

export default function Account() {
	const router = useRouter();
	const t = useT(accountStrings);
	const errorText = useErrorText();
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
	// While that sign-in finishes, only the sky shows, so the form never flashes before Home.
	const [returning, setReturning] = useState(() => query.includes("verifier"));
	useEffect(() => {
		if (!query.includes("verifier") || redeemed.current === query) {
			return;
		}
		redeemed.current = query;
		redeemVerifier(query).then((ok) => {
			if (ok) {
				goNext(router);
			} else {
				setReturning(false);
				setNote(t("returnedFailed"));
			}
		});
	}, [query, router, t]);

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

	const social = (provider: "apple" | "google") =>
		run(async () => {
			const result = await signInWith(provider);
			if (result === "ok") {
				await goNext(router);
			} else if (result === "failed") {
				setNote(t(PROVIDER_FAILED[provider]));
			}
		});

	const send = emailForm.handleSubmit(({ email }) =>
		run(async () => {
			if (await sendCode(email)) {
				setAddress(email);
				codeForm.reset();
				setStep("code");
			} else {
				setNote(t("sendFailed"));
			}
		})
	);

	const resend = () =>
		run(async () => {
			setNote(t((await sendCode(address)) ? "resent" : "sendFailed"));
		});

	const signIn = codeForm.handleSubmit(({ code }) =>
		run(async () => {
			if (await verifyCode(address, code)) {
				await goNext(router);
			} else {
				setNote(t("codeFailed"));
			}
		})
	);

	const changeEmail = () => {
		codeForm.reset();
		setNote(null);
		setStep("email");
	};

	if (returning) {
		return null;
	}

	if (step === "email") {
		return (
			<Screen
				bodyStyle={styles.fieldBody}
				dock={<PrimaryButton label={t("sendCode")} onPress={send} />}
				title={t("hello")}
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
							error={errorText(fieldState.error?.message) ?? note ?? undefined}
							key="email"
							keyboardType="email-address"
							label={t("email")}
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
				dock={<PrimaryButton label={t("signIn")} onPress={signIn} />}
				title={t("hello")}
			>
				<Controller
					control={codeForm.control}
					name="code"
					render={({ field, fieldState }) => (
						<TextField
							autoComplete="one-time-code"
							autoCorrect={false}
							error={errorText(fieldState.error?.message) ?? note ?? undefined}
							inputStyle={CODE_STYLE}
							key="code"
							keyboardType="number-pad"
							label={t("codeLabel")}
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
				<View style={styles.links}>
					<QuietLink label={t("newCode")} onPress={resend} />
					<QuietLink label={t("differentEmail")} onPress={changeEmail} />
				</View>
			</Screen>
		);
	}

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<SecondaryButton
						label={t("continueEmail")}
						onPress={() => {
							setNote(null);
							setStep("email");
						}}
					/>
					<PrimaryButton
						label={t("continueGoogle")}
						leading={<GoogleMark />}
						onPress={() => social("google")}
					/>
					<PrimaryButton
						label={t("continueApple")}
						leading={<AppleMark color={colors.black} />}
						onPress={() => social("apple")}
						tone="white"
					/>
				</>
			}
			title={t("hello")}
		>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.lead, LEAD]}
				variant="body"
			>
				{t("lead")}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.kids, QUIET]}
				variant="label"
			>
				{t("kids")}
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
	kids: { marginTop: spacing.md },
	lead: { paddingHorizontal: spacing.md },
	// Starts below the field's error line, which is drawn in the gap under the field.
	links: { alignItems: "flex-start", marginTop: spacing.lg },
	note: { marginTop: spacing.lg },
});
