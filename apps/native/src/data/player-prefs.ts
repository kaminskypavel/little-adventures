// What the grown-up chose in the place player's menu, kept for the session: the read-along line
// on or off, and whether the menu is open. Music on/off lives with the bed in music-store.
import { create } from "zustand";

interface PlayerPrefs {
	captions: boolean;
	menuOpen: boolean;
	setMenuOpen: (menuOpen: boolean) => void;
	toggleCaptions: () => void;
}

export const usePlayerPrefs = create<PlayerPrefs>((set) => ({
	captions: true,
	menuOpen: false,
	setMenuOpen: (menuOpen) => set({ menuOpen }),
	toggleCaptions: () => set((s) => ({ captions: !s.captions })),
}));
