// The no-login demo as app state: on or off, the finished adventures it lists, which one is open,
// and the progress the child makes in them. Never persisted: closing the app ends the demo. The
// adventure client asks this store for everything while the demo is on.
import { create } from "zustand";
import { ENV } from "@/src/env";
import {
	DEMO_BASE_DEFAULT,
	type DemoEntry,
	FRESH_PROGRESS,
	getJson,
	parseAdventure,
	parseIndex,
	stepProgress,
} from "./demo-client";
import type { EngineAdventure } from "./engine-client";
import { queryClient } from "./query-client";
import type { NodeId, Progress } from "./types";

const base = (ENV.EXPO_PUBLIC_DEMO_BASE ?? DEMO_BASE_DEFAULT).replace(
	/\/$/u,
	""
);

interface Demo {
	/** The adventure being played, so the screens know whose child is listening. */
	currentId: string | null;
	enter: () => void;
	entries: DemoEntry[] | null;
	exit: () => void;
	failed: boolean;
	on: boolean;
	open: (id: string) => void;
	progress: Record<string, Progress>;
	/** The adventure file, read once per demo. */
	read: (id: string) => Promise<EngineAdventure>;
	visit: (id: string, node: NodeId) => Progress;
}

const files = new Map<string, Promise<EngineAdventure>>();

export const useDemo = create<Demo>()((set, get) => ({
	currentId: null,
	enter: () => {
		set({ failed: false, on: true });
		if (get().entries) {
			return;
		}
		getJson(`${base}/index.json`).then(
			(json) => set({ entries: parseIndex(json) }),
			() => set({ failed: true })
		);
	},
	entries: null,
	exit: () => {
		files.clear();
		queryClient.removeQueries({ queryKey: ["adventure"] });
		set({
			currentId: null,
			entries: null,
			failed: false,
			on: false,
			progress: {},
		});
	},
	failed: false,
	on: false,
	open: (id) => set({ currentId: id }),
	progress: {},
	read: (id) => {
		let file = files.get(id);
		if (!file) {
			file = getJson(`${base}/${id}/adventure.json`).then(parseAdventure);
			file.catch(() => files.delete(id));
			files.set(id, file);
		}
		return file;
	},
	visit: (id, node) => {
		const next = stepProgress(get().progress[id], node);
		set((s) => ({ progress: { ...s.progress, [id]: next } }));
		return next;
	},
}));

export const isDemo = () => useDemo.getState().on;

/** True while the demo is on. */
export const useIsDemo = () => useDemo((s) => s.on);

/** The first read of a demo adventure's progress: nothing walked, only the intro open. */
export const demoProgress = (id: string): Progress => {
	const p = useDemo.getState().progress[id] ?? FRESH_PROGRESS;
	return { ...p, visited: [...p.visited] };
};

/** The child of the demo adventure that is open; undefined outside the demo. */
export const useDemoChildName = () =>
	useDemo((s) =>
		s.on
			? (s.entries?.find((e) => e.id === s.currentId)?.child.name ?? "")
			: undefined
	);
