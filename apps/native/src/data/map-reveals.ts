// Which places of which adventure the map has already shown open, kept on the phone: a place
// breaks its seal and pops in once, also across leaving the map and coming back to it. A place
// that is sealed again (Start again) is forgotten, so it can open anew.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deviceStorage } from "./device-storage";
import type { NodeId } from "./types";

interface MapReveals {
	/** The stored list has been read back; before that nothing can be told from "seen". */
	hydrated: boolean;
	/** By adventure id: the places the map showed open the last time it was drawn. */
	seen: Record<string, NodeId[]>;
	/** Sets the places shown open now for this adventure (the sealed ones fall out). */
	show: (adventureId: string, open: readonly NodeId[]) => void;
}

export const useMapReveals = create<MapReveals>()(
	persist(
		(set) => ({
			hydrated: false,
			seen: {},
			show: (adventureId, open) =>
				set((s) => {
					const before = s.seen[adventureId] ?? [];
					const same =
						before.length === open.length &&
						open.every((node) => before.includes(node));
					return same ? s : { seen: { ...s.seen, [adventureId]: [...open] } };
				}),
		}),
		{
			name: "map-reveals",
			onRehydrateStorage: () => () => {
				useMapReveals.setState({ hydrated: true });
			},
			partialize: (s) => ({ seen: s.seen }),
			storage: deviceStorage(),
		}
	)
);
