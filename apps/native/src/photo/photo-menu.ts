import { Alert } from "react-native";
import { uploadChildPhoto } from "@/src/data/photo-upload";
import {
	useChildById,
	useDeleteChildPhoto,
	useSaveProfile,
} from "@/src/data/profile-queries";
import { showMenu } from "@/src/menu/show-menu";
import { CAMERA_OFF, pick, type Source, UPLOAD_FAILED } from "./photo-step";

/** The system sheet for a photo: Take, Choose, and (when there is one) Remove. */
export const photoMenu = (
	title: string,
	set: (source: Source) => void,
	remove: (() => void) | null
) =>
	showMenu(title, [
		{ label: "Take a photo", onPress: () => set("camera") },
		{ label: "Choose a photo", onPress: () => set("library") },
		...(remove
			? [{ destructive: true, label: "Remove photo", onPress: remove }]
			: []),
	]);

/**
 * Take, choose or remove the photo of the child with this id, saved on that child without leaving
 * the screen (the current child is not touched). Returns what the camera badge opens.
 */
export function useChildPhotoMenu(childId: string) {
	const saveProfile = useSaveProfile();
	const deletePhoto = useDeleteChildPhoto();
	const child = useChildById(childId).data;
	const set = async (source: Source) => {
		try {
			const uri = await pick(source);
			if (uri === "denied") {
				Alert.alert(CAMERA_OFF);
			} else if (uri) {
				await saveProfile(
					{ hasPhoto: true, photoKey: await uploadChildPhoto(uri) },
					{ id: childId }
				);
			}
		} catch {
			Alert.alert(UPLOAD_FAILED);
		}
	};
	return () =>
		photoMenu(
			child ? `${child.profile.childName}'s photo` : "Photo",
			set,
			child?.profile.hasPhoto ? () => deletePhoto(childId) : null
		);
}
