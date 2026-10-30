import { useSyncExternalStore } from "react";
import { getSession, type Session, subscribe } from "./auth-client";

/** `{ status: "loading" | "signed-out" | "signed-in", user }`, live. */
export function useSession(): Session {
	return useSyncExternalStore(subscribe, getSession, getSession);
}
