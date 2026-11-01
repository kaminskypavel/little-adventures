import type { Style } from "./engine-client";

/** The three ways an adventure can be drawn, in the order the picker shows them. */
export const STYLES: readonly Style[] = ["clay", "felt", "wood"];

/** A style from the address: anything unknown is clay. */
export const toStyle = (value: string | undefined): Style =>
	STYLES.find((style) => style === value) ?? "clay";
