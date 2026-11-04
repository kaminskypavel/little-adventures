import { useNavigation, useRoute, useRouter } from "expo-router";
import { backTarget } from "@/src/back-rules";
import { leaveActive } from "@/src/screen-fade";

// The adventure screens close through the night sky like every other way out of them.
const ADVENTURE_SCREENS = new Set(["choice", "end", "map", "place"]);

/** What the shared back button does on the screen it is in, or null when the screen has no back. */
export function useBack(): (() => void) | null {
	const navigation = useNavigation();
	const router = useRouter();
	const { name } = useRoute();
	const target = backTarget(name, navigation.canGoBack());
	const through = ADVENTURE_SCREENS.has(name)
		? leaveActive
		: (go: () => void) => go();
	if (target === "back") {
		return () => through(() => navigation.goBack());
	}
	if (target === "home") {
		return () => through(() => router.replace("/home"));
	}
	return null;
}
