import { createStore } from "zustand/vanilla";

// Where the story is: the scene on screen, whether a move is playing, and how
// long input stays ignored after a move (so a trackpad's momentum cannot skip a scene).
// Touch is different: a finger has no momentum, so a new swipe always counts. A new
// gesture (a swipe or trackpad flick) made while a move plays waits for it to
// land; the gesture that started a move never counts twice.
interface StoryState {
	at: number;
	busy: boolean;
	calmUntil: number;
	/** Gestures so far: each new finger on the screen, or each new trackpad flick. */
	gesture: number;
	/** The gesture that started the latest move. */
	moveGesture: number;
	/** A swipe made during a move: the step (+1 or -1) to take when it lands. */
	queued: number;
}

interface StoryActions {
	/** The move landed on `scene`; returns the queued step (0 when none). */
	arrive: (scene: number, calmMs: number) => number;
	/** Whether a gesture toward `scene` should start a move now. */
	canGo: (scene: number, sceneCount: number, touch?: boolean) => boolean;
	/** A move to another scene has started; input waits until it lands. */
	leave: () => void;
	/** A finger touched the screen. */
	press: () => void;
	/** A gesture arrived that could not move now: keep it if it is new and a move is playing. */
	queueSwipe: (step: number) => void;
}

export type StoryStore = StoryState & StoryActions;

export const createStoryStore = () =>
	createStore<StoryStore>()((set, get) => ({
		arrive: (scene, calmMs) => {
			const { queued } = get();
			set({
				at: scene,
				busy: false,
				calmUntil: performance.now() + calmMs,
				queued: 0,
			});
			return queued;
		},
		at: 0,
		busy: false,
		calmUntil: 0,
		canGo: (scene, sceneCount, touch = false) => {
			const { at, busy, calmUntil, gesture, moveGesture } = get();
			const inRange = scene >= 0 && scene < sceneCount && scene !== at;
			const settled = touch
				? gesture !== moveGesture
				: performance.now() >= calmUntil;
			return inRange && !busy && settled;
		},
		gesture: 0,
		leave: () => set({ busy: true, moveGesture: get().gesture, queued: 0 }),
		moveGesture: -1,
		press: () => set({ gesture: get().gesture + 1 }),
		queued: 0,
		queueSwipe: (step) => {
			const { busy, gesture, moveGesture } = get();
			if (busy && gesture !== moveGesture) {
				set({ queued: step });
			}
		},
	}));
