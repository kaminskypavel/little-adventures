import { router, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import { queryClient } from "@/src/data/query-client";
import { tNow } from "@/src/i18n";
import { needsAccountStrings } from "@/src/i18n/strings/needs-account";
import { signOut } from "./auth-client";
import { isGuestReadOnly } from "./guest";
import { useIsGuest } from "./use-session";

const say = (key: keyof (typeof needsAccountStrings)["en"]) =>
	tNow(needsAccountStrings, key);

/** Sign the guest out, then on to the sign-in screen the way Welcome's "Get started" goes. */
async function createAccount() {
	await signOut();
	router.replace("/welcome");
	router.push("/account");
}

/** The one popup every guest block shows. */
export function showNeedsAccount() {
	Alert.alert(say("title"), say("body"), [
		{ onPress: createAccount, text: say("create") },
		{ style: "cancel", text: say("notNow") },
	]);
}

/**
 * Wires the data layer once: any write the server refuses with GUEST_READ_ONLY shows the popup,
 * so no button needs its own check.
 */
export const watchGuestWrites = () =>
	queryClient.getMutationCache().subscribe((event) => {
		if (
			event.type === "updated" &&
			event.action.type === "error" &&
			isGuestReadOnly(event.action.error)
		) {
			showNeedsAccount();
		}
	});

/** For a screen a guest must never use (reached by a link): popup and step back. */
export function useBlockGuest() {
	const guest = useIsGuest();
	const nav = useRouter();
	useFocusEffect(
		useCallback(() => {
			if (!guest) {
				return;
			}
			if (nav.canGoBack()) {
				nav.back();
			} else {
				nav.replace("/home");
			}
			showNeedsAccount();
		}, [guest, nav])
	);
}
