/**
 * The sign-in sheet comes back on little-adventures://auth/callback. The auth client reads that
 * link itself; on Android it also reaches the router, which would open it as a page and show "not
 * found". A null keeps the router where it is.
 */
export function redirectSystemPath({
	path,
}: {
	path: string;
	initial: boolean;
}) {
	return path.includes("auth/callback") ? null : path;
}
