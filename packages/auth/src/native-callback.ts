/**
 * Neon Auth only accepts http(s) callbacks, so after sign-in on a phone the
 * browser lands on a route on our own origin, which redirects to the app's URL
 * scheme to resume the app. The scheme must come from env, never from the
 * request, so this is not an open redirect. Only the query string (the Neon
 * session verifier) is carried over. `search` is URL.search: empty, or
 * starting with "?".
 */
export const nativeCallbackUrl = (scheme: string, search: string) =>
	`${scheme}://auth/callback${search}`;
