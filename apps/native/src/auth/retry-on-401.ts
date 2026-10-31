export interface RetryOn401 {
	/** Sends the request with this bearer token (null: no token yet). */
	call: (jwt: string | null) => Promise<Response>;
	getToken: () => Promise<string | null>;
	mint: () => Promise<string | null>;
	signOut: () => Promise<void>;
}

/**
 * The sign-in rule for every server the app calls with its token: a 401 mints a fresh JWT once and
 * retries once; if that fails too the session is over and the user is signed out.
 */
export async function withRetryOn401({
	call,
	getToken,
	mint,
	signOut,
}: RetryOn401): Promise<Response> {
	let res = await call(await getToken());
	if (res.status !== 401) {
		return res;
	}
	const fresh = await mint();
	if (fresh) {
		res = await call(fresh);
		if (res.status !== 401) {
			return res;
		}
	}
	await signOut();
	return res;
}
