import {
	type ComponentType,
	createContext,
	type ReactNode,
	useContext,
} from "react";

/** The body melts into the sky over this many pt above the dock. */
export const BODY_FADE = 80;
/** A scrolling body also fades over this many pt under the headline. */
export const BODY_FADE_TOP = 40;
/**
 * Bottom padding for a scroll view above a faded dock: the fade plus a small gap, so the last
 * item scrolls fully clear of it.
 */
export const BODY_SCROLL_END = BODY_FADE + 16;
/**
 * Top padding for a scroll view in a scrolling body: at rest nothing sits in the top fade. The
 * scroll view must start at the very top of the body (no padding above it) for the fade to line up.
 */
export const BODY_SCROLL_START = BODY_FADE_TOP;

/**
 * CSS mask for the web body fade: `top` pt fading in at the top, `bottom` pt fading out at the
 * bottom (either may be 0).
 */
export function bodyMaskImage(top: number, bottom: number) {
	const from = top > 0 ? `transparent, #000 ${top}px, ` : "";
	const to = bottom > 0 ? `#000 calc(100% - ${bottom}px), transparent` : "#000";
	return `linear-gradient(to bottom, ${from}${to})`;
}

/**
 * The native half of the body fade. The kit cannot depend on a masking library, so the app
 * supplies a component that draws `children` with their first `top` pt fading in and their last
 * `height` pt fading to transparent (either may be 0). Web needs none: `Screen` uses a CSS mask.
 */
export type BodyMask = ComponentType<{
	children: ReactNode;
	height: number;
	top: number;
}>;

const BodyMaskContext = createContext<BodyMask | null>(null);

export function BodyFadeProvider({
	children,
	mask,
}: {
	children: ReactNode;
	mask: BodyMask;
}) {
	return <BodyMaskContext value={mask}>{children}</BodyMaskContext>;
}

export const useBodyMask = () => useContext(BodyMaskContext);
