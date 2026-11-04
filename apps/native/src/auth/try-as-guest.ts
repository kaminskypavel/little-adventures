import { startRoute } from "@/src/data/adventure-client";
import { signInAsGuest } from "./auth-client";

/** Sign in as the shared guest; the route to open next, or null when the guest could not start. */
export async function guestRoute() {
	return (await signInAsGuest()) ? await startRoute() : null;
}
