import { createContext, type ReactNode, useContext } from "react";
import { IconButton } from "./icon-button";

/**
 * A hook the app supplies: it returns what the back button does, or null when the screen has no
 * back (the first screen of the app). The kit has no router, so the app plugs its own in.
 */
type UseBack = () => (() => void) | null;

const noBack: UseBack = () => null;
const BackContext = createContext<UseBack>(noBack);

/** Gives every `Screen` below it a round back button, wired to `useBack`. */
export function BackProvider({
	children,
	useBack,
}: {
	children: ReactNode;
	useBack: UseBack;
}) {
	return <BackContext value={useBack}>{children}</BackContext>;
}

/** What the back button does on this screen, or null when it is hidden. */
export function useBackAction() {
	const useBack = useContext(BackContext);
	return useBack();
}

/** The one back button every screen shares: round, top left, the same as the top bar action buttons. */
export function BackButton({ onPress }: { onPress: () => void }) {
	return <IconButton accessibilityLabel="Back" icon="back" onPress={onPress} />;
}
