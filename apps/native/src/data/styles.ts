import type { Style } from "./engine-client";

/** The ways an adventure can be drawn, in the order the picker shows them. */
export const STYLES: readonly Style[] = ["animated", "clay", "felt", "wood"];

/** The styles that can be picked for now. The others are shown, locked. */
export const LIVE_STYLES: readonly Style[] = ["animated"];

/** A style from the address: anything unknown or locked is animated. */
export const toStyle = (value: string | undefined): Style =>
	LIVE_STYLES.find((style) => style === value) ?? "animated";
