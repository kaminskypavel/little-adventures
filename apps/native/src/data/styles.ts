import type { Style } from "./engine-client";

/** The ways an adventure can be drawn, in the order the picker shows them. */
const STYLES: readonly Style[] = ["animated", "clay", "felt", "wood"];

/** A style from the address: anything unknown is clay. */
export const toStyle = (value: string | undefined): Style =>
	STYLES.find((style) => style === value) ?? "clay";
