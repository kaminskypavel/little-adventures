import { useNavigation, useRoute, useRouter } from "expo-router";
import { backTarget } from "@/src/back-rules";

/** What the shared back button does on the screen it is in, or null when the screen has no back. */
export function useBack(): (() => void) | null {
	const navigation = useNavigation();
	const router = useRouter();
	const { name } = useRoute();
	const target = backTarget(name, navigation.canGoBack());
	if (target === "back") {
		return () => navigation.goBack();
	}
	if (target === "home") {
		return () => router.replace("/home");
	}
	return null;
}
