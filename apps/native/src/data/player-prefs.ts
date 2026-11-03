// What the grown-up chose in the adventure menu (the burger on the map and the place player):
// the read-along line on or off, kept on the phone across screens and restarts, and whether the
// menu is open right now; and the app's language (Grown-ups > Language), kept the same way. Music on/off lives with the bed in music-store, kept the same way.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/src/i18n";
import { deviceStorage } from "./device-storage";

interface PlayerPrefs {
	captions: boolean;
	language: Language;
	menuOpen: boolean;
	setLanguage: (language: Language) => void;
	setMenuOpen: (menuOpen: boolean) => void;
	toggleCaptions: () => void;
}

export const usePlayerPrefs = create<PlayerPrefs>()(
	persist(
		(set) => ({
			captions: true,
			language: "en",
			menuOpen: false,
			setLanguage: (language) => set({ language }),
			setMenuOpen: (menuOpen) => set({ menuOpen }),
			toggleCaptions: () => set((s) => ({ captions: !s.captions })),
		}),
		{
			name: "player-prefs",
			// The menu starts closed on every launch.
			partialize: (s) => ({ captions: s.captions, language: s.language }),
			storage: deviceStorage(),
		}
	)
);
