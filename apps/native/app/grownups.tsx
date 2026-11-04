import { BODY_SCROLL_START } from "@little-adventures/native-ui/body-fade";
import { SecondaryButton } from "@little-adventures/native-ui/button";
import {
	type Called,
	PRESETS,
} from "@little-adventures/native-ui/called-chips";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { PlanCard } from "@little-adventures/native-ui/plan-card";
import { Portrait, PortraitArt } from "@little-adventures/native-ui/portrait";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { signOut as endSession } from "@/src/auth/auth-client";
import { useSession } from "@/src/auth/use-session";
import { reprepareChild } from "@/src/data/adventure-client";
import { usePlayerPrefs } from "@/src/data/player-prefs";
import { grownUpImage } from "@/src/data/profile-map";
import {
	useChild,
	useDeleteGrownUpPhoto,
	useGrownUpPhoto,
	useSetCalled,
} from "@/src/data/profile-queries";
import { isRtl, LANGUAGES, type Language, useLanguage, useT } from "@/src/i18n";
import { grownupsStrings } from "@/src/i18n/strings/grownups";
import { LanguagePicker } from "@/src/language-picker";
import { askText, showMenu } from "@/src/menu/show-menu";
import { photoMenu } from "@/src/photo/photo-menu";
import type { Source } from "@/src/photo/photo-step";

// 18 Grown-ups, "You first" (round 7, 390 x 844 frame): your 128 portrait with its camera badge,
// "You", what the child calls you and the pill; 80 pt under the pill's top the flat plan card, then
// the account.
const NAME_GAP = 16;
const PILL_GAP = 14;
const PILL_HEIGHT = 44;
const PLAN_GAP = 36;
const FOOT_GAP = 30;
const MAX_WORD = 30;
const LANGUAGE_GAP = 28;
// The presets are saved under their English names; the words on screen follow the language.
const PRESET_KEYS = {
	father: "papa",
	grandfather: "grandpa",
	grandmother: "grandma",
	mother: "mama",
} as const;

export default function Grownups() {
	const router = useRouter();
	const { user } = useSession();
	const who = user?.name?.trim() || user?.email;
	// The cache asks again after every save (see profile-queries.ts).
	const { data: child } = useChild();
	const name = child?.profile.childName ?? "";
	const { data: grownUpPhoto } = useGrownUpPhoto();
	const deleteOwnPhoto = useDeleteGrownUpPhoto();
	const setCalled = useSetCalled();
	const t = useT(grownupsStrings);
	const language = useLanguage();
	// Hebrew reads right to left on this screen; the layout stays left to right elsewhere.
	const rtl = isRtl(language);

	const calledName = (called: Called) =>
		called.relation === "other" ? called.name : t(PRESET_KEYS[called.relation]);

	// The language is kept first, so the next adventure is prepared in it.
	const changeLanguage = (next: Language) => {
		if (next === language) {
			return;
		}
		usePlayerPrefs.getState().setLanguage(next);
		reprepareChild(child?.id);
	};
	const languageName =
		LANGUAGES.find((l) => l.code === language)?.name ?? language;

	const signOut = async () => {
		await endSession();
		router.replace("/welcome");
	};

	// The grown-up's photo keeps its own step (approve, then what the child calls you).
	const setOwnPhoto = (source: Source) =>
		router.push(`/grownup-photo?replace=1&source=${source}`);

	const askOther = () =>
		askText?.(t("askCalled", { name }), (text) => {
			const word = text.trim().slice(0, MAX_WORD);
			if (!word) {
				return;
			}
			showMenu(t("inStoryIs", { word }), [
				{
					label: t("he"),
					onPress: () =>
						setCalled({ name: word, pronoun: "he", relation: "other" }),
				},
				{
					label: t("she"),
					onPress: () =>
						setCalled({ name: word, pronoun: "she", relation: "other" }),
				},
			]);
		});
	const calledMenu = () =>
		showMenu(t("askCalled", { name }), [
			...PRESETS.map((called) => ({
				label: calledName(called),
				onPress: () => setCalled(called),
			})),
			...(askText ? [{ label: t("other"), onPress: askOther }] : []),
		]);

	// Pinned under the page, so sign out is in sight on any phone without scrolling.
	const foot = child ? (
		<View style={styles.foot}>
			<ClayText
				align={rtl ? "right" : undefined}
				color={colors.cream}
				numberOfLines={1}
				style={styles.signed}
				variant="body"
			>
				{who ? t("signedInAs", { who }) : t("signedIn")}
			</ClayText>
			<View style={[styles.link, rtl ? styles.linkRtl : null]}>
				<QuietLink label={t("signOut")} onPress={signOut} />
			</View>
		</View>
	) : null;

	return (
		<Screen dock={foot} scrolls topBar={<TopBar title={t("title")} />}>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: FOOT_GAP,
					paddingTop: BODY_SCROLL_START,
				}}
				showsVerticalScrollIndicator={false}
			>
				{child ? (
					<>
						<View style={styles.you}>
							<Portrait
								cameraLabel={t("changePhoto")}
								onCamera={() =>
									photoMenu(
										t("yourPhoto"),
										setOwnPhoto,
										grownUpPhoto ? deleteOwnPhoto : null
									)
								}
							>
								<PortraitArt
									accessibilityLabel={t("yourPhoto")}
									image={grownUpPhoto ? grownUpImage(grownUpPhoto) : null}
								/>
							</Portrait>
							<ClayText
								align="center"
								color={colors.cream}
								numberOfLines={1}
								style={styles.name}
								variant="title"
							>
								{t("you")}
							</ClayText>
							<ClayText
								align="center"
								color={colors.cream}
								numberOfLines={1}
								style={styles.sub}
								variant="body"
							>
								{t("callsYou", { name })}
							</ClayText>
							<View style={styles.pillSlot}>
								{grownUpPhoto ? (
									<SecondaryButton
										accessibilityLabel={t("whatCalled", { name })}
										label={
											grownUpPhoto.called
												? calledName(grownUpPhoto.called)
												: t("pick")
										}
										onPress={calledMenu}
										size="sm"
										style={styles.pill}
									/>
								) : null}
							</View>
						</View>
						<PlanCard
							items={[t("planOne"), t("planTwo")]}
							note={t("planNote")}
							rtl={rtl}
							style={styles.plan}
							tag={t("planTag")}
							title={t("planTitle")}
						/>
						<LanguagePicker
							chooseLabel={t("chooseLanguage")}
							closeLabel={t("closeSheet")}
							current={language}
							label={t("language")}
							onPick={changeLanguage}
							rowLabel={t("languageLabel", { language: languageName })}
							rtl={rtl}
							style={styles.language}
						/>
					</>
				) : null}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	foot: { paddingHorizontal: 30 },
	language: { marginTop: LANGUAGE_GAP },
	link: { alignItems: "flex-start", marginTop: -2 },
	linkRtl: { alignItems: "flex-end" },
	name: { fontSize: 26, lineHeight: 30, marginTop: NAME_GAP },
	pill: { alignSelf: "center", paddingHorizontal: 20 },
	pillSlot: { height: PILL_HEIGHT, marginTop: PILL_GAP },
	plan: { marginTop: PLAN_GAP },
	signed: { fontSize: 17, lineHeight: 22, opacity: 0.6 },
	sub: { fontSize: 17, lineHeight: 22, opacity: 0.7 },
	you: { alignItems: "center" },
});
