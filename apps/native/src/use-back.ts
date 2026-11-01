import { useNavigation, useRoute } from "expo-router";
import { showsBack } from "@/src/back-rules";

/** What the shared back button does on the screen it is in, or null when the screen has no back. */
export function useBack(): (() => void) | null {
	const navigation = useNavigation();
	const { name } = useRoute();
	return showsBack(name, navigation.canGoBack())
		? () => navigation.goBack()
		: null;
}
