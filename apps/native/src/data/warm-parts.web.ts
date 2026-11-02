// On the web a player only loads through a mounted video, so a part is warmed by reading its
// first bytes into the browser's HTTP cache instead.
const WARM_BYTES = 512 * 1024;
const warmed = new Set<string>();

/** Starts loading one part's file. Safe to call again for the same url. */
export function warmPart(url: string) {
	if (warmed.has(url)) {
		return;
	}
	warmed.add(url);
	fetch(url, { headers: { Range: `bytes=0-${WARM_BYTES - 1}` } })
		.then((response) => response.arrayBuffer())
		.catch(() => {
			// Only a head start: the part loads on its own when its place opens.
			warmed.delete(url);
		});
}

/** Warms these urls. Nothing is held on the web, so nothing is let go. */
export function keepWarm(urls: readonly string[]) {
	for (const url of urls) {
		warmPart(url);
	}
}

export const releaseWarm = () => undefined;
