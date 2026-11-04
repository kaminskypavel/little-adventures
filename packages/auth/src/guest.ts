import type { Principal } from "./bearer";

/**
 * The shared demo account. The email is public; its password lives only in the
 * web server's env (GUEST_PASSWORD), so nobody can sign in or change it by hand.
 */
export const GUEST_EMAIL = "guest@littleadventures.app";

/** Whether this principal is the shared guest account (case does not matter). */
export const isGuest = (principal: Principal) =>
	principal.user.email?.trim().toLowerCase() === GUEST_EMAIL;
