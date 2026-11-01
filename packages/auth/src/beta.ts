/**
 * The private beta: who may use the app's paid features. `list` is the comma
 * separated BETA_EMAILS setting. An empty or unset list lets nobody in, so a
 * deploy that forgets the setting costs nothing.
 */
export function betaEmails(list: string | undefined): Set<string> {
	return new Set(
		(list ?? "")
			.split(",")
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)
	);
}

/** Whether this email is in the beta (case does not matter). */
export const inBeta = (emails: Set<string>, email: string | undefined) =>
	email !== undefined && emails.has(email.trim().toLowerCase());

/** The message every refused call carries, so the app can show the beta screen. */
export const BETA_ONLY = "Little Adventures is in private beta";
