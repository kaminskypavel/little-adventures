import { PrimaryButton } from "@little-adventures/native-ui/button";
import { Screen } from "@little-adventures/native-ui/screen";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useBlockGuest } from "@/src/auth/needs-account";
import { ChildFields, useChildForm } from "@/src/child/child-form";
import { emptyProfile } from "@/src/data/profile-map";
import { useChild, useSaveProfile } from "@/src/data/profile-queries";
import type { Profile } from "@/src/data/types";
import { useT } from "@/src/i18n";
import { childStrings } from "@/src/i18n/strings/child";

function ChildForm({ isNew, profile }: { isNew: boolean; profile: Profile }) {
	const router = useRouter();
	const t = useT(childStrings);
	const saveProfile = useSaveProfile();
	const { control, handleSubmit } = useChildForm(profile);

	const next = handleSubmit(async ({ age, kind, name }) => {
		await saveProfile(
			{ childAge: age, childKind: kind, childName: name },
			{ create: isNew }
		);
		if (isNew) {
			// The child now exists and is the current one: a second Next edits it, never adds again.
			router.setParams({ new: undefined });
		}
		router.push("/photo");
	});

	return (
		<Screen
			dock={<PrimaryButton label={t("next")} onPress={next} />}
			title={t("title")}
		>
			{/* With the keyboard up the body shrinks above Next, and the rest of the form scrolls. */}
			<ScrollView
				contentContainerStyle={styles.body}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<ChildFields control={control} />
			</ScrollView>
		</Screen>
	);
}

export default function Child() {
	useBlockGuest();
	const { data } = useChild();
	// `?new=1` (Grown-ups, "Add a child"): an empty form that adds a child instead of editing.
	const { new: add } = useLocalSearchParams<{ new?: string }>();
	const isNew = add === "1";
	return data ? (
		<ChildForm isNew={isNew} profile={isNew ? emptyProfile : data.profile} />
	) : null;
}

const styles = StyleSheet.create({
	body: { paddingTop: 34 },
});
