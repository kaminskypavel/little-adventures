import { useWindowDimensions } from "react-native";
import { create } from "zustand";

// The adventure screens: they turn the phone on iOS and ask for the turn on the web.
const ADVENTURE_SCREENS = new Set(["/map", "/choice", "/place", "/end"]);

/** The pathname is an adventure screen (map, choice, place or end). */
export const isAdventurePath = (pathname: string) =>
	ADVENTURE_SCREENS.has(pathname);

/** The web grown-up chose to play the adventure upright, for this visit only. */
export const useUpright = create<{ upright: boolean; play: () => void }>(
	(set) => ({ play: () => set({ upright: true }), upright: false })
);

/** The window is wider than tall: the adventure screens draw their landscape layouts. */
export function useLandscape() {
	const { height, width } = useWindowDimensions();
	return width > height;
}
