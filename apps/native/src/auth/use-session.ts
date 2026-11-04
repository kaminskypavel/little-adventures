import { useSyncExternalStore } from "react";
import { getSession, type Session, subscribe } from "./auth-client";
import { isGuestEmail } from "./guest";

/** `{ status: "loading" | "signed-out" | "signed-in", user }`, live. */
export function useSession(): Session {
	return useSyncExternalStore(subscribe, getSession, getSession);
}

/** Whether the signed-in account is the shared guest. */
export const useIsGuest = () => isGuestEmail(useSession().user?.email);
