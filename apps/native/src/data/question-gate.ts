// The hold a place keeps on its player while a card is up: the question card at the opening, the
// "What we learned" card before goodnight. `phase` is "card" while the card holds the place,
// "fading" once it lets go (the place starts, the card fades out), "done" when it is gone.
import { useEffect } from "react";
import { create } from "zustand";

type Phase = "card" | "done" | "fading";

interface Gate {
	finish: (key: string, fadeMs: number) => void;
	key: string | null;
	phase: Phase;
	reset: () => void;
}

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

export const useGate = create<Gate>()((set, get) => ({
	finish: (key, fadeMs) => {
		if (get().key === key && get().phase === "fading") {
			return;
		}
		set({ key, phase: "fading" });
		clearTimeout(fadeTimer);
		fadeTimer = setTimeout(() => set({ key, phase: "done" }), fadeMs);
	},
	key: null,
	phase: "card",
	reset: () => {
		clearTimeout(fadeTimer);
		set({ key: null, phase: "card" });
	},
}));

/**
 * Where the card of `key` stands. A card for another key (or none yet) is at "card", so a place
 * never starts before its card has spoken. Leaving the screen clears it: the next opening asks again.
 */
export function useGatePhase(key: string): Phase {
	useEffect(() => () => useGate.getState().reset(), []);
	return useGate((s) => (s.key === key ? s.phase : "card"));
}
