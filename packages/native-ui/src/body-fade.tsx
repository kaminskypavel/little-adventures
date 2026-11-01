import {
	type ComponentType,
	createContext,
	type ReactNode,
	useContext,
} from "react";

/**
 * The native half of the body fade. The kit cannot depend on a masking library, so the app
 * supplies a component that draws `children` with their last `height` pt fading to transparent.
 * Web needs none: `Screen` uses a CSS mask there.
 */
export type BodyMask = ComponentType<{
	children: ReactNode;
	height: number;
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
