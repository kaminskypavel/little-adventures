import { Alert } from "react-native";
import { uploadChildPhoto } from "@/src/data/photo-upload";
import {
	useChildById,
	useDeleteChildPhoto,
	useSaveProfile,
} from "@/src/data/profile-queries";
import { tNow, useT } from "@/src/i18n";
import { photoStrings } from "@/src/i18n/strings/photo";
import { showMenu } from "@/src/menu/show-menu";
import { pick, type Source } from "./photo-step";

/** The system sheet for a photo: Take, Choose, and (when there is one) Remove. */
export const photoMenu = (
	title: string,
	set: (source: Source) => void,
	remove: (() => void) | null
) =>
	showMenu(title, [
		{ label: tNow(photoStrings, "take"), onPress: () => set("camera") },
		{ label: tNow(photoStrings, "choose"), onPress: () => set("library") },
		...(remove
			? [
					{
						destructive: true,
						label: tNow(photoStrings, "remove"),
						onPress: remove,
					},
				]
			: []),
	]);

/**
 * Take, choose or remove the photo of the child with this id, saved on that child without leaving
 * the screen (the current child is not touched). Returns what the camera badge opens.
 */
export function useChildPhotoMenu(childId: string) {
	const t = useT(photoStrings);
	const saveProfile = useSaveProfile();
	const deletePhoto = useDeleteChildPhoto();
	const child = useChildById(childId).data;
	const set = async (source: Source) => {
		try {
			const uri = await pick(source);
			if (uri === "denied") {
				Alert.alert(t("cameraOff"));
			} else if (uri) {
				await saveProfile(
					{ hasPhoto: true, photoKey: await uploadChildPhoto(uri) },
					{ id: childId }
				);
			}
		} catch {
			Alert.alert(t("uploadFailed"));
		}
	};
	return () =>
		photoMenu(
			child ? t("menuTitle", { name: child.profile.childName }) : t("photo"),
			set,
			child?.profile.hasPhoto ? () => deletePhoto(childId) : null
		);
}
