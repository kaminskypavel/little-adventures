import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { uploadChildPhoto } from "@/src/data/photo-upload";
import { useChild, useSaveProfile } from "@/src/data/profile-queries";
import type { Profile } from "@/src/data/types";
import {
	ADVANCE_MS,
	CAMERA_OFF,
	LINE,
	PhotoRing,
	pick,
	type Source,
	UPLOAD_FAILED,
} from "@/src/photo/photo-step";

function PhotoStep({ profile }: { profile: Profile }) {
	const router = useRouter();
	const saveProfile = useSaveProfile();
	const [done, setDone] = useState(false);
	const [photoUri, setPhotoUri] = useState<string | null>(null);
	const [note, setNote] = useState<string | null>(null);
	// Taps are ignored while a photo is on its way, and once it has gone.
	const busy = useRef<boolean>(false);

	useEffect(() => {
		if (!done) {
			return;
		}
		const timer = setTimeout(() => router.push("/coming"), ADVANCE_MS);
		return () => clearTimeout(timer);
	}, [done, router]);

	const choose = async (source: Source) => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		setNote(null);
		try {
			const uri = await pick(source);
			if (uri === "denied") {
				setNote(CAMERA_OFF);
			} else if (uri) {
				const photoKey = await uploadChildPhoto(uri);
				await saveProfile({ hasPhoto: true, photoKey });
				setPhotoUri(uri);
				notificationAsync(NotificationFeedbackType.Success);
				setDone(true);
				return;
			}
		} catch {
			setNote(UPLOAD_FAILED);
		}
		busy.current = false;
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<>
					<PrimaryButton
						icon="camera"
						label="Take a photo"
						onPress={() => choose("camera")}
					/>
					<SecondaryButton
						icon="image"
						label="Choose a photo"
						onPress={() => choose("library")}
					/>
				</>
			}
			title={`Add a photo\nof ${profile.childName}`}
		>
			<PhotoRing done={done} photoUri={photoUri} />
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="body"
			>
				{`Only used to draw storybook ${profile.childName}. Never shown or shared.`}
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

export default function Photo() {
	const { data } = useChild();
	return data ? <PhotoStep profile={data.profile} /> : null;
}

const styles = StyleSheet.create({
	body: { alignItems: "center", paddingTop: 44 },
	line: { marginTop: 45, paddingHorizontal: 14 },
	note: { marginTop: spacing.md, paddingHorizontal: spacing.md },
});
