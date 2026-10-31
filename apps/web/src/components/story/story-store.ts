import { createStore } from "zustand/vanilla";

// Where the story is: the scene on screen, whether a move is playing, and how
// long input stays ignored after a move (so a trackpad's momentum cannot skip a scene).
interface StoryState {
	at: number;
	busy: boolean;
	calmUntil: number;
}

interface StoryActions {
	/** The move landed on `scene`; input stays quiet for `calmMs`. */
	arrive: (scene: number, calmMs: number) => void;
	/** Whether a gesture toward `scene` should start a move now. */
	canGo: (scene: number, sceneCount: number) => boolean;
	/** A move to another scene has started; input waits until it lands. */
	leave: () => void;
}

export type StoryStore = StoryState & StoryActions;

export const createStoryStore = () =>
	createStore<StoryStore>()((set, get) => ({
		arrive: (scene, calmMs) =>
			set({ at: scene, busy: false, calmUntil: performance.now() + calmMs }),
		at: 0,
		busy: false,
		calmUntil: 0,
		canGo: (scene, sceneCount) => {
			const { at, busy, calmUntil } = get();
			const inRange = scene >= 0 && scene < sceneCount && scene !== at;
			return inRange && !busy && performance.now() >= calmUntil;
		},
		leave: () => set({ busy: true }),
	}));
