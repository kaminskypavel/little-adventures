import { useFocusEffect } from "expo-router";
import { type ReactNode, useCallback } from "react";
import { create } from "zustand";

interface ScreenTools {
	/** Shown as the section title, like "Listening". */
	title: string;
	tools: ReactNode;
}

/**
 * The admin sheet's shared state: open or closed (the floating button and the overlay are
 * mounted apart), and the tools the screen on top offers, shown above the switches.
 */
export const useAdminPanel = create<{
	open: boolean;
	screen: ScreenTools | null;
	setOpen: (open: boolean) => void;
}>((set) => ({
	open: false,
	screen: null,
	setOpen: (open) => set({ open }),
}));

/** Puts this screen's admin tools in the admin sheet while the screen is on top. */
export function useScreenAdminTools(title: string, tools: ReactNode) {
	useFocusEffect(
		useCallback(() => {
			useAdminPanel.setState({ screen: { title, tools } });
			return () => {
				if (useAdminPanel.getState().screen?.title === title) {
					useAdminPanel.setState({ screen: null });
				}
			};
		}, [title, tools])
	);
}
