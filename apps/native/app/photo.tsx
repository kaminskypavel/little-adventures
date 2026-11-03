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
import { useT } from "@/src/i18n";
import { photoStrings } from "@/src/i18n/strings/photo";
import {
	ADVANCE_MS,
	LINE,
	PhotoRing,
	pick,
	type Source,
} from "@/src/photo/photo-step";

function PhotoStep({ profile }: { profile: Profile }) {
	const router = useRouter();
	const t = useT(photoStrings);
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
				setNote(t("cameraOff"));
			} else if (uri) {
				const photoKey = await uploadChildPhoto(uri);
				await saveProfile({ hasPhoto: true, photoKey });
				setPhotoUri(uri);
				notificationAsync(NotificationFeedbackType.Success);
				setDone(true);
				return;
			}
		} catch {
			setNote(t("uploadFailed"));
		}
		busy.current = false;
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<PrimaryButton
					icon="camera"
					label={t("take")}
					onPress={() => choose("camera")}
				/>
			}
			title={t("title")}
		>
			<PhotoRing done={done} photoUri={photoUri} />
			<SecondaryButton
				icon="image"
				label={t("choose")}
				onPress={() => choose("library")}
				size="md"
				style={styles.chip}
			/>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.line, LINE]}
				variant="body"
			>
				{t("line", { name: profile.childName })}
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
	chip: { alignSelf: "center", marginTop: spacing.lg, paddingHorizontal: 28 },
	line: { marginTop: spacing.lg, paddingHorizontal: 14 },
	note: { marginTop: spacing.md, paddingHorizontal: spacing.md },
});
