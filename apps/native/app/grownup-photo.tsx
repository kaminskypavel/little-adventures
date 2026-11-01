import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, spacing } from "@little-adventures/native-ui/tokens";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { saveGrownUpPhoto, saveProfile } from "@/src/data/adventure-client";
import { uploadChildPhoto } from "@/src/data/photo-upload";
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
	const [done, setDone] = useState(false);
	const [note, setNote] = useState<string | null>(null);
	const busy = useRef<boolean>(false);

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
		try {
			const uri = await pick(source);
			if (uri === "denied") {
				setNote(CAMERA_OFF);
			} else if (uri) {
				await saveGrownUpPhoto(await uploadChildPhoto(uri));
				notificationAsync(NotificationFeedbackType.Success);
				setDone(true);
				return;
			}
		} catch {
			setNote(UPLOAD_FAILED);
		}
		busy.current = false;
	};

	const skip = async () => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		try {
			await saveProfile({ grownUp: false });
			router.push("/handover");
		} catch {
			busy.current = false;
		}
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
					{replacing ? null : <QuietLink label="Not now" onPress={skip} />}
				</>
			}
			title={"Add a photo\nof you"}
		>
			<PhotoRing done={done} />
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
	line: { marginTop: 45, paddingHorizontal: 14 },
	note: { marginTop: spacing.md, paddingHorizontal: spacing.md },
});
