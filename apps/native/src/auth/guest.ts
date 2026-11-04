// The server owns the same value (packages/auth/src/guest.ts); the app cannot import that package.
export const GUEST_EMAIL = "guest@littleadventures.app";

/** The message the server puts on the FORBIDDEN it answers to a guest's write. */
export const GUEST_READ_ONLY = "GUEST_READ_ONLY";

/** Whether this sign-in email is the shared guest account (case does not matter). */
export const isGuestEmail = (email: string | null | undefined) =>
	email?.trim().toLowerCase() === GUEST_EMAIL;

/** A server error that says "the guest may not write" (a tRPC error or an engine error). */
export const isGuestReadOnly = (error: unknown) => {
	const e = error as {
		code?: string;
		data?: { code?: string };
		message?: string;
	} | null;
	return (
		(e?.data?.code ?? e?.code) === "FORBIDDEN" && e?.message === GUEST_READ_ONLY
	);
};
