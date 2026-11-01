import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { uploadChildPhoto } from "@/src/data/photo-upload";
import { grownUpPicture } from "@/src/data/profile-map";
import {
	useGrownUpPhoto,
	useSaveGrownUpPhoto,
	useSaveProfile,
} from "@/src/data/profile-queries";
import {
	ADVANCE_MS,
	CAMERA_OFF,
	LINE,
	PhotoRing,
	pick,
	type Source,
	UPLOAD_FAILED,
} from "@/src/photo/photo-step";

export default function GrownUpPhoto() {
	const router = useRouter();
	const { replace } = useLocalSearchParams<{ replace?: string }>();
	const replacing = replace === "1";
	const saveGrownUpPhoto = useSaveGrownUpPhoto();
	const saveProfile = useSaveProfile();
	const { data: saved } = useGrownUpPhoto();
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

	useEffect(() => {
		if (!done) {
			return;
		}
		const timer = setTimeout(
			() => (replacing ? router.back() : router.push("/handover")),
			ADVANCE_MS
		);
		return () => clearTimeout(timer);
	}, [done, replacing, router]);

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
				setNote(CAMERA_OFF);
			} else if (uri) {
				setPending(uri);
			}
		} catch {
			setNote(UPLOAD_FAILED);
		}
		busy.current = false;
	};

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
			setNote(UPLOAD_FAILED);
		}
		busy.current = false;
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				pending ? (
					<PrimaryButton
						icon="check"
						label="Use this photo"
						onPress={approvePhoto}
					/>
				) : (
					<PrimaryButton
						icon="camera"
						label="Take a photo"
						onPress={() => choose("camera")}
					/>
				)
			}
			title={"Add a\nphoto of you"}
		>
			<PhotoRing done={done} photoUri={pending ?? photoUri} />
			<SecondaryButton
				icon="image"
				label={pending ? "Pick another" : "Choose a photo"}
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
				Only used to draw you in the story. Never shown or shared.
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
	body: { alignItems: "center", paddingTop: 44 },
	chip: { alignSelf: "center", marginTop: spacing.lg, paddingHorizontal: 22 },
	line: { marginTop: spacing.lg, paddingHorizontal: 14 },
	note: { marginTop: spacing.md, paddingHorizontal: spacing.md },
});
