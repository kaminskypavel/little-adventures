import {
	BODY_SCROLL_END,
	BODY_SCROLL_START,
} from "@little-adventures/native-ui/body-fade";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { Portrait, PortraitArt } from "@little-adventures/native-ui/portrait";
import { Screen } from "@little-adventures/native-ui/screen";
import { portrait, spacing } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { ChildFields, useChildForm } from "@/src/child/child-form";
import type { Child } from "@/src/data/profile-map";
import { useChildById, useSaveProfile } from "@/src/data/profile-queries";
import { useChildPhotoMenu } from "@/src/photo/photo-menu";

function EditChild({ child, id }: { child: Child; id: string }) {
	const router = useRouter();
	const saveProfile = useSaveProfile();
	const openPhoto = useChildPhotoMenu(id);
	const { control, handleSubmit } = useChildForm(child.profile);

	const done = handleSubmit(async ({ age, kind, name }) => {
		await saveProfile(
			{ childAge: age, childKind: kind, childName: name },
			{ id }
		);
		router.back();
	});

	return (
		<Screen
			dock={<PrimaryButton label="Done" onPress={done} />}
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
						cameraLabel={`Change ${child.profile.childName}'s photo`}
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
	portrait: { alignItems: "center", marginBottom: spacing.lg },
});
