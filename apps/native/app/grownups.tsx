import { BODY_SCROLL_START } from "@little-adventures/native-ui/body-fade";
import { SecondaryButton } from "@little-adventures/native-ui/button";
import { PRESETS } from "@little-adventures/native-ui/called-chips";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { PlanCard } from "@little-adventures/native-ui/plan-card";
import { Portrait, PortraitArt } from "@little-adventures/native-ui/portrait";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, layout } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut as endSession } from "@/src/auth/auth-client";
import { useSession } from "@/src/auth/use-session";
import { grownUpImage } from "@/src/data/profile-map";
import {
	useChild,
	useDeleteGrownUpPhoto,
	useGrownUpPhoto,
	useSetCalled,
} from "@/src/data/profile-queries";
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
const PLAN_ITEMS = ["3 new adventures a day", "Every story saved"];

export default function Grownups() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { user } = useSession();
	const who = user?.name?.trim() || user?.email;
	// The cache asks again after every save (see profile-queries.ts).
	const { data: child } = useChild();
	const name = child?.profile.childName ?? "";
	const { data: grownUpPhoto } = useGrownUpPhoto();
	const deleteOwnPhoto = useDeleteGrownUpPhoto();
	const setCalled = useSetCalled();

	const signOut = async () => {
		await endSession();
		router.replace("/welcome");
	};

	// The grown-up's photo keeps its own step (approve, then what the child calls you).
	const setOwnPhoto = (source: Source) =>
		router.push(`/grownup-photo?replace=1&source=${source}`);

	const askOther = () =>
		askText?.(`What does ${name} call you?`, (text) => {
			const word = text.trim().slice(0, MAX_WORD);
			if (!word) {
				return;
			}
			showMenu(`In the story, ${word} is`, [
				{
					label: "he",
					onPress: () =>
						setCalled({ name: word, pronoun: "he", relation: "other" }),
				},
				{
					label: "she",
					onPress: () =>
						setCalled({ name: word, pronoun: "she", relation: "other" }),
				},
			]);
		});
	const calledMenu = () =>
		showMenu(`What does ${name} call you?`, [
			...PRESETS.map((called) => ({
				label: called.name,
				onPress: () => setCalled(called),
			})),
			...(askText ? [{ label: "Other...", onPress: askOther }] : []),
		]);

	return (
		<Screen scrolls topBar={<TopBar title="Grown-ups" />}>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: insets.bottom + layout.dockBottom,
					paddingTop: BODY_SCROLL_START,
				}}
				showsVerticalScrollIndicator={false}
			>
				{child ? (
					<>
						<View style={styles.you}>
							<Portrait
								cameraLabel="Change your photo"
								onCamera={() =>
									photoMenu(
										"Your photo",
										setOwnPhoto,
										grownUpPhoto ? deleteOwnPhoto : null
									)
								}
							>
								<PortraitArt
									accessibilityLabel="Your photo"
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
								You
							</ClayText>
							<ClayText
								align="center"
								color={colors.cream}
								numberOfLines={1}
								style={styles.sub}
								variant="body"
							>
								{`${name} calls you`}
							</ClayText>
							<View style={styles.pillSlot}>
								{grownUpPhoto ? (
									<SecondaryButton
										accessibilityLabel={`What ${name} calls you`}
										label={grownUpPhoto.called?.name ?? "Pick"}
										onPress={calledMenu}
										size="sm"
										style={styles.pill}
									/>
								) : null}
							</View>
						</View>
						<PlanCard
							items={PLAN_ITEMS}
							note="Paid plans are coming. The beta is free."
							style={styles.plan}
							tag="BETA"
							title="Your plan"
						/>
						<View style={styles.foot}>
							<ClayText
								color={colors.cream}
								numberOfLines={1}
								style={styles.signed}
								variant="body"
							>
								{who ? `Signed in as ${who}` : "Signed in"}
							</ClayText>
							<View style={styles.link}>
								<QuietLink label="Sign out" onPress={signOut} />
							</View>
						</View>
					</>
				) : null}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	foot: { marginTop: FOOT_GAP, paddingHorizontal: 30 },
	link: { alignItems: "flex-start", marginTop: -2 },
	name: { fontSize: 26, lineHeight: 30, marginTop: NAME_GAP },
	pill: { alignSelf: "center", paddingHorizontal: 20 },
	pillSlot: { height: PILL_HEIGHT, marginTop: PILL_GAP },
	plan: { marginTop: PLAN_GAP },
	signed: { fontSize: 17, lineHeight: 22, opacity: 0.6 },
	sub: { fontSize: 17, lineHeight: 22, opacity: 0.7 },
	you: { alignItems: "center" },
});
