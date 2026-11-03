// A replay of an adventure on this phone: the child walks it again from the intro while the
// server keeps the places as watched. While an adventure has a replay here, its progress (visited,
// here, goodnight lock) is the replay's, wherever the adventure reads it (see useAdventure). It
// ends when the replay reaches the end screen. Kept on the phone, per adventure id, so closing
// the app mid-replay resumes it.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deviceStorage } from "./device-storage";
import type { NodeId, Progress } from "./types";

interface Replay {
	byId: Record<string, Progress>;
	/** The replay is over: the stored progress shows again. */
	clear: (id: string) => void;
	/** Begins again from nothing visited: the map opens on the intro alone. */
	start: (id: string) => void;
	/** The child watched `node` in the replay. Nothing when no replay is running. */
	step: (id: string, node: NodeId) => Progress | null;
}

export const useReplay = create<Replay>()(
	persist(
		(set, get) => ({
			byId: {},
			clear: (id) => {
				if (!get().byId[id]) {
					return;
				}
				const { [id]: _done, ...rest } = get().byId;
				set({ byId: rest });
			},
			start: (id) =>
				set((s) => ({
					byId: { ...s.byId, [id]: { here: "intro", visited: [] } },
				})),
			step: (id, node) => {
				const now = get().byId[id];
				if (!now) {
					return null;
				}
				const next: Progress = {
					here: node,
					visited: now.visited.includes(node)
						? now.visited
						: [...now.visited, node],
				};
				set((s) => ({ byId: { ...s.byId, [id]: next } }));
				return next;
			},
		}),
		{
			name: "replay-progress",
			storage: deviceStorage(),
		}
	)
);
