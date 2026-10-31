// Which file plays where in the landing story, and in what order it loads.
// Pure functions, so the rules are tested without a browser.

export const SCENE_COUNT = 7;
// Scenes downloaded whole before the loading screen lifts; the rest follow in story order.
export const GATE = 3;
// The clips live on the CDN; a new set of files gets a new version folder.
export const MEDIA_BASE = "https://cdn.littleadventures.app/landing/story/v5";

export interface Screen {
	/** A very wide screen that gets the 4K loops (AV1 only). */
	big: boolean;
	/** The visitor asked for reduced motion: stills only, no moves or loops. */
	calm: boolean;
	/** "" plays AV1 files, "-hevc" the HEVC copies (Safari). */
	codec: "" | "-hevc";
	/** Taller than wide: the phone set of files. */
	tall: boolean;
}

export type MediaKind = "loop" | "move" | "still";

export interface PlanItem {
	/** Index of the element of that kind: still and loop by scene, move by the scene it lands on. */
	index: number;
	kind: MediaKind;
	/** The scene a visitor reaches before this file is needed. */
	scene: number;
	src: string;
}

export const storyUrls = (screen: Screen) => {
	const shape = screen.tall ? "t" : "w";
	const { codec } = screen;
	return {
		/** The move from `scene` back to the one before it. */
		back: (scene: number) =>
			`${MEDIA_BASE}/move-${shape}${scene}-back${codec}.mp4`,
		loop: (scene: number) => {
			if (screen.tall) {
				return `${MEDIA_BASE}/loop-t${scene}${codec}.mp4`;
			}
			return screen.big && !codec
				? `${MEDIA_BASE}/loop-w${scene}-4k.mp4`
				: `${MEDIA_BASE}/loop-w${scene}${codec}.mp4`;
		},
		/** The move that lands on `scene`. */
		move: (scene: number) => `${MEDIA_BASE}/move-${shape}${scene}${codec}.mp4`,
		still: (scene: number) => `${MEDIA_BASE}/still-${shape}${scene}.webp`,
	};
};

/** Everything the story needs going forward, in the order a visitor meets it. */
export const loadPlan = (screen: Screen): PlanItem[] => {
	const url = storyUrls(screen);
	const plan: PlanItem[] = [];
	for (let scene = 0; scene < SCENE_COUNT; scene += 1) {
		plan.push({ index: scene, kind: "still", scene, src: url.still(scene) });
		// Every scene rests on its loop; reduced motion keeps to the stills.
		if (!screen.calm) {
			plan.push({ index: scene, kind: "loop", scene, src: url.loop(scene) });
		}
		const next = scene + 1;
		if (next < SCENE_COUNT && !screen.calm) {
			plan.push({
				index: next,
				kind: "move",
				scene: next,
				src: url.move(next),
			});
		}
	}
	return plan;
};

/** Which dot is lit: the question (scenes 0 and 1), the adventure, goodnight. */
export const litDot = (scene: number) => {
	if (scene < 2) {
		return 0;
	}
	return scene < SCENE_COUNT - 1 ? 1 : 2;
};

/** How full a dot is; the adventure dot fills as the worlds go by. */
export const dotFill = (dot: number, scene: number) => {
	const lit = litDot(scene);
	if (dot !== lit) {
		return dot < lit ? 1 : 0;
	}
	return dot === 1 ? (scene - 1) / (SCENE_COUNT - 3) : 1;
};
