import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, motion, spacing } from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { signOut } from "@/src/auth/auth-client";
import { readHelloSeen, writeHelloSeen } from "@/src/auth/token-store";
import { useSession } from "@/src/auth/use-session";
import { useT } from "@/src/i18n";
import { helloStrings } from "@/src/i18n/strings/hello";

// Screen 02b: the star 220 pt wide in the upper third, then title, line and caption.
const STAR = 220;
const WHITESPACE = /\s+/u;
const LINE_WIDTH = 300;
const LINE = { fontSize: 22, lineHeight: 28, opacity: 0.85 } as const;
const CAPTION = { opacity: 0.6 } as const;
// The text fades up 8 pt over 220 ms, 60 ms after the star starts. No kit token for this yet.
const TEXT_RISE = 8;
const TEXT_MS = 220;
const ease = cubicBezier(...motion.easeOut);
const riseIn = {
	from: { opacity: 0, transform: [{ translateY: TEXT_RISE }] },
	to: { opacity: 1, transform: [{ translateY: 0 }] },
};

/** Fade-up for the text under the star. Still under reduced motion (the screen itself fades in). */
function FadeUp({
	children,
	step,
	style,
}: {
	children: ReactNode;
	step: number;
	style?: object;
}) {
	const calm = useCalm();
	return (
		<Animated.View
			style={[
				style,
				calm
					? null
					: {
							animationDelay: `${step * motion.enterStagger}ms`,
							animationDuration: `${TEXT_MS}ms`,
							animationFillMode: "backwards",
							animationName: riseIn,
							animationTimingFunction: ease,
						},
			]}
		>
			{children}
		</Animated.View>
	);
}

export default function Hello() {
	const router = useRouter();
	const { user } = useSession();
	const t = useT(helloStrings);
	const [back, setBack] = useState<boolean | null>(null);

	useEffect(() => {
		let live = true;
		(async () => {
			const seen = await readHelloSeen().catch(() => false);
			if (live) {
				setBack(seen);
			}
			await writeHelloSeen().catch(() => undefined);
		})();
		return () => {
			live = false;
		};
	}, []);

	if (back === null) {
		return null;
	}
	const first = user?.name?.trim().split(WHITESPACE)[0];
	let title = t("welcome");
	if (first) {
		title = t(back ? "welcomeBack" : "welcomeName", { name: first });
	}

	const leave = async () => {
		await signOut();
		router.replace("/welcome");
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<PrimaryButton
					label={t("addChild")}
					onPress={() => router.push("/child")}
				/>
			}
		>
			<View style={styles.star}>
				<StarTake size={STAR} take="wave" />
			</View>
			<FadeUp step={1} style={styles.title}>
				<ClayText
					accessibilityRole="header"
					align="center"
					color={colors.cream}
					numberOfLines={2}
					variant="headline"
				>
					{title}
				</ClayText>
			</FadeUp>
			<FadeUp step={2}>
				<QuietLink label={t("signOut")} onPress={leave} />
			</FadeUp>
			<FadeUp step={2} style={styles.line}>
				<ClayText
					align="center"
					color={colors.cream}
					style={LINE}
					variant="body"
				>
					{t("line")}
				</ClayText>
			</FadeUp>
			<FadeUp step={2} style={styles.caption}>
				<ClayText
					align="center"
					color={colors.cream}
					style={CAPTION}
					variant="label"
				>
					{t("caption")}
				</ClayText>
			</FadeUp>
		</Screen>
	);
}

const styles = StyleSheet.create({
	body: { alignItems: "center", paddingTop: 72 },
	caption: { marginTop: spacing.md },
	line: { marginTop: spacing.md, maxWidth: LINE_WIDTH },
	star: { height: STAR, width: STAR },
	title: { alignSelf: "stretch", marginTop: spacing.lg },
});
