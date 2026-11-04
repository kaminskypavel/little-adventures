import {
	BODY_SCROLL_END,
	BODY_SCROLL_START,
} from "@little-adventures/native-ui/body-fade";
import {
	PrimaryButton,
	SecondaryButton,
} from "@little-adventures/native-ui/button";
import { Portrait, PortraitArt } from "@little-adventures/native-ui/portrait";
import { Screen } from "@little-adventures/native-ui/screen";
import { portrait, spacing } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useBlockGuest } from "@/src/auth/needs-account";
import { ChildFields, useChildForm } from "@/src/child/child-form";
import type { Child } from "@/src/data/profile-map";
import {
	useChildById,
	useChildren,
	useDeleteChild,
	useSaveProfile,
} from "@/src/data/profile-queries";
import { tNow, useT } from "@/src/i18n";
import { childEditStrings } from "@/src/i18n/strings/child-edit";
import { showMenuStrings } from "@/src/i18n/strings/show-menu";
import { useChildPhotoMenu } from "@/src/photo/photo-menu";

function EditChild({ child, id }: { child: Child; id: string }) {
	const router = useRouter();
	const t = useT(childEditStrings);
	const saveProfile = useSaveProfile();
	const openPhoto = useChildPhotoMenu(id);
	const deleteChild = useDeleteChild();
	const childCount = useChildren()?.length ?? 0;
	const { control, handleSubmit } = useChildForm(child.profile);

	const done = handleSubmit(async ({ age, kind, name }) => {
		await saveProfile(
			{ childAge: age, childKind: kind, childName: name },
			{ id }
		);
		router.back();
	});

	// This screen is only reached through the lock on "Who's listening?", so the grown-up gate is
	// already passed. The delete is soft: the child is hidden everywhere and nothing is erased.
	const confirmDelete = () =>
		Alert.alert(
			t("confirmTitle", { name: child.profile.childName }),
			t("confirmBody", { name: child.profile.childName }),
			[
				{
					onPress: () => {
						deleteChild(id).catch(() => undefined);
						if (childCount > 1) {
							router.back();
							return;
						}
						// The last child is gone: back to the first welcome, which adds one.
						router.dismissAll();
						router.replace("/hello");
					},
					style: "destructive",
					text: t("confirmDelete"),
				},
				{ style: "cancel", text: tNow(showMenuStrings, "cancel") },
			]
		);

	return (
		<Screen
			dock={<PrimaryButton label={t("done")} onPress={done} />}
			scrolls
			topBar={<TopBar title={child.profile.childName} />}
		>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: BODY_SCROLL_END,
					paddingTop: BODY_SCROLL_START,
				}}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.portrait}>
					<Portrait
						cameraLabel={t("changePhoto", { name: child.profile.childName })}
						onCamera={openPhoto}
						size={portrait.child}
					>
						<PortraitArt
							drawing={child.profile.artStatus === "working"}
							image={child.avatar}
							size={portrait.child}
						/>
					</Portrait>
				</View>
				<ChildFields control={control} />
				{/* At the end of the page, a small red button: behind the grown-up hold and a confirm. */}
				<View style={styles.delete}>
					<SecondaryButton
						label={t("delete", { name: child.profile.childName })}
						onPress={confirmDelete}
						size="sm"
						tone="danger"
					/>
				</View>
			</ScrollView>
		</Screen>
	);
}

/** One child's full edit screen. The child is `?id=`; the current child is never touched. */
export default function ChildEdit() {
	useBlockGuest();
	const { id } = useLocalSearchParams<{ id: string }>();
	const child = useChildById(id).data;
	return child ? <EditChild child={child} id={id} /> : null;
}

const styles = StyleSheet.create({
	delete: { alignItems: "center", marginTop: spacing.xl },
	portrait: { alignItems: "center", marginBottom: spacing.lg },
});
