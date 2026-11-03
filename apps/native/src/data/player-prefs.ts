// What the grown-up chose in the adventure menu (the burger on the map and the place player):
// the read-along line on or off, kept on the phone across screens and restarts, and whether the
// menu is open right now. Music on/off lives with the bed in music-store, kept the same way.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PlayerPrefs {
	captions: boolean;
	menuOpen: boolean;
	setMenuOpen: (menuOpen: boolean) => void;
	toggleCaptions: () => void;
}

export const usePlayerPrefs = create<PlayerPrefs>()(
	persist(
		(set) => ({
			captions: true,
			menuOpen: false,
			setMenuOpen: (menuOpen) => set({ menuOpen }),
			toggleCaptions: () => set((s) => ({ captions: !s.captions })),
		}),
		{
			name: "player-prefs",
			// The menu starts closed on every launch.
			partialize: (s) => ({ captions: s.captions }),
			storage: createJSONStorage(() => AsyncStorage),
		}
	)
);
