/** Which bundled stand-in a picture gets when its own is missing or fails to load. */
export type ArtKind = "goalClosed" | "goalOpen" | "place";

/** The bundled stand-ins, `require()`d modules. A kind without one falls back to the neutral placeholder. */
export type FallbackArt = Record<ArtKind, number | null>;

/** A stable id for a picture source, so a failed load can be matched to the source that failed. */
export function sourceKey(source: unknown): string {
	if (typeof source === "number") {
		return `module:${source}`;
	}
	if (typeof source === "string") {
		return source;
	}
	if (typeof source === "object" && source !== null && "uri" in source) {
		return String(source.uri);
	}
	return "";
}

/**
 * The picture to show: the source itself, unless it is missing (null) or is the one that failed to
 * load (`failedKey`); then the stand-in, or null when there is none.
 */
export function pickSource<T>(
	source: T | null,
	failedKey: string | null,
	fallback: number | null
): T | number | null {
	if (source === null || sourceKey(source) === failedKey) {
		return fallback;
	}
	return source;
}
