import { BODY_SCROLL_END } from "@little-adventures/native-ui/body-fade";
import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { CalledChips } from "@little-adventures/native-ui/called-chips";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { uploadChildPhoto } from "@/src/data/photo-upload";
import { grownUpPicture } from "@/src/data/profile-map";
import {
	useChild,
	useGrownUpPhoto,
	useSaveGrownUpPhoto,
	useSaveProfile,
	useSetCalled,
} from "@/src/data/profile-queries";
import { useT } from "@/src/i18n";
import { useCalledLabels } from "@/src/i18n/strings/called";
import { grownUpPhotoStrings } from "@/src/i18n/strings/grownup-photo";
import { LINE, PhotoRing, pick, type Source } from "@/src/photo/photo-step";

// With the question under it the ring shrinks from 236 to 150 pt to make room.
const SMALL_RING = 150;

export default function GrownUpPhoto() {
	const router = useRouter();
	const t = useT(grownUpPhotoStrings);
	const calledLabels = useCalledLabels();
	const { replace, source: autoSource } = useLocalSearchParams<{
		replace?: string;
		source?: Source;
	}>();
	const replacing = replace === "1";
	const saveGrownUpPhoto = useSaveGrownUpPhoto();
	const saveProfile = useSaveProfile();
	const setCalled = useSetCalled();
	const { data: saved } = useGrownUpPhoto();
	const { data: child } = useChild();
	const childName = child?.profile.childName;
	const [done, setDone] = useState(false);
	// The photo just picked, or the saved one when the grown-up comes back.
	const [photoUri, setPhotoUri] = useState<string | null>(null);
	// A photo picked but not yet approved; nothing is uploaded until "Use this photo".
	const [pending, setPending] = useState<string | null>(null);
	const lastSource = useRef<Source>("library");
	const [note, setNote] = useState<string | null>(null);
	const busy = useRef<boolean>(false);

	// The saved photo shows as its face cut-out, like the child's, once it is cut out.
	useEffect(() => {
		if (saved) {
			setPhotoUri(grownUpPicture(saved));
		}
	}, [saved]);

	const choose = async (source: Source) => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		setNote(null);
		lastSource.current = source;
		try {
			const uri = await pick(source);
			if (uri === "denied") {
				setNote(t("cameraOff"));
			} else if (uri) {
				setPending(uri);
			}
		} catch {
			setNote(t("uploadFailed"));
		}
		busy.current = false;
	};

	// Grown-ups opens this screen with "camera" or "library" to start the picker at once.
	const launched = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: choose is new each render; the ref runs it once
	useEffect(() => {
		if (
			(autoSource === "camera" || autoSource === "library") &&
			!launched.current
		) {
			launched.current = true;
			choose(autoSource);
		}
	}, [autoSource]);

	const approvePhoto = async () => {
		if (busy.current || !pending) {
			return;
		}
		busy.current = true;
		setNote(null);
		try {
			await saveGrownUpPhoto(await uploadChildPhoto(pending));
			// The photo is what makes You the companion, so the choice is saved with it.
			await saveProfile({ grownUp: true, puppy: false });
			setPhotoUri(pending);
			setPending(null);
			notificationAsync(NotificationFeedbackType.Success);
			setDone(true);
			return;
		} catch {
			setNote(t("uploadFailed"));
		}
		busy.current = false;
	};

	const next = () => (replacing ? router.back() : router.push("/handover"));

	if (done) {
		return (
			<Screen
				dock={
					<PrimaryButton
						disabled={!saved?.called}
						label={t("next")}
						onPress={next}
					/>
				}
				scrolls
				title={t("title")}
			>
				<ScrollView
					automaticallyAdjustKeyboardInsets
					contentContainerStyle={styles.question}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.center}>
						<PhotoRing done photoUri={photoUri} size={SMALL_RING} />
					</View>
					<ClayText color={colors.cream} style={styles.ask} variant="label">
						{t("ask", { name: childName ?? "" })}
					</ClayText>
					<CalledChips
						labels={calledLabels}
						onChange={setCalled}
						value={saved?.called ?? null}
					/>
					<ClayText
						align="center"
						color={colors.cream}
						style={[styles.line, LINE]}
						variant="body"
					>
						{t("hears", { name: childName ?? "" })}
					</ClayText>
				</ScrollView>
			</Screen>
		);
	}

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				pending ? (
					<PrimaryButton icon="check" label={t("use")} onPress={approvePhoto} />
				) : (
					<PrimaryButton
						icon="camera"
						label={t("take")}
						onPress={() => choose("camera")}
					/>
				)
			}
			title={t("title")}
		>
			<PhotoRing done={false} photoUri={pending ?? photoUri} />
			<SecondaryButton
				icon="image"
				label={pending ? t("pickAnother") : t("choose")}
				onPress={() => choose(pending ? lastSource.current : "library")}
				size="md"
				style={styles.chip}
			/>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="body"
			>
				{t("line")}
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
	ask: {
		marginTop: spacing.lg,
		opacity: 0.85,
		paddingBottom: spacing.sm,
		paddingLeft: spacing.sm,
	},
	body: { alignItems: "center", paddingTop: 44 },
	center: { alignItems: "center" },
	chip: { alignSelf: "center", marginTop: spacing.lg, paddingHorizontal: 22 },
	line: { marginTop: spacing.lg, paddingHorizontal: 14 },
	note: { marginTop: spacing.md, paddingHorizontal: spacing.md },
	question: { paddingBottom: BODY_SCROLL_END, paddingTop: 44 },
});
