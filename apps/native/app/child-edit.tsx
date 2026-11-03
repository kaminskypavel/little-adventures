import {
	BODY_SCROLL_END,
	BODY_SCROLL_START,
} from "@little-adventures/native-ui/body-fade";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { Portrait, PortraitArt } from "@little-adventures/native-ui/portrait";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { Screen } from "@little-adventures/native-ui/screen";
import { portrait, spacing } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
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
			dock={
				// The delete sits in the dock, always in sight above Done: below the fields it ended up
				// hidden behind the dock on an iPhone 12. It is still behind the grown-up hold and a confirm.
				<View style={styles.dock}>
					<View style={styles.deleteRow}>
						<QuietLink
							label={t("delete", { name: child.profile.childName })}
							onPress={confirmDelete}
						/>
					</View>
					<PrimaryButton label={t("done")} onPress={done} />
				</View>
			}
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
			</ScrollView>
		</Screen>
	);
}

/** One child's full edit screen. The child is `?id=`; the current child is never touched. */
export default function ChildEdit() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const child = useChildById(id).data;
	return child ? <EditChild child={child} id={id} /> : null;
}

const styles = StyleSheet.create({
	deleteRow: { alignItems: "center" },
	dock: { gap: spacing.sm },
	portrait: { alignItems: "center", marginBottom: spacing.lg },
});
