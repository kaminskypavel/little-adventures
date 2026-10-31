import { describe, expect, test } from "bun:test";
import media from "./story-media.json";
import {
	dotFill,
	GATE,
	litDot,
	loadPlan,
	MEDIA_BASE,
	restsOnLoop,
	SCENE_COUNT,
	type Screen,
	storyUrls,
} from "./story-plan";

const ON_CDN = new Set(media.files.map((f) => `${MEDIA_BASE}/${f}`));
const SCREENS: Screen[] = [false, true].flatMap((tall) =>
	(["", "-hevc"] as const).flatMap((codec) =>
		[false, true].flatMap((big) =>
			[false, true].map((calm) => ({ big, calm, codec, tall }))
		)
	)
);
const label = (s: Screen) =>
	`${s.tall ? "phone" : "computer"}${s.codec || " av1"}${s.big ? " big" : ""}${s.calm ? " calm" : ""}`;
const SCENES = Array.from({ length: SCENE_COUNT }, (_, i) => i);

describe("story files", () => {
	for (const screen of SCREENS) {
		test(`every file is on the CDN: ${label(screen)}`, () => {
			const url = storyUrls(screen);
			const backs = SCENES.slice(1).map(url.back);
			const missing = [...loadPlan(screen).map((f) => f.src), ...backs].filter(
				(src) => !ON_CDN.has(src)
			);
			expect(missing).toEqual([]);
		});
	}
});

describe("load order", () => {
	const wide: Screen = { big: false, calm: false, codec: "", tall: false };

	test("follows the story: each scene's still, its loop, then the move out of it", () => {
		const order = loadPlan(wide).map((f) => `${f.kind}${f.index}`);
		expect(order.slice(0, 7)).toEqual([
			"still0",
			"loop0",
			"move1",
			"still1",
			"loop1",
			"move2",
			"still2",
		]);
		const scenes = loadPlan(wide).map((f) => f.scene);
		expect(scenes).toEqual([...scenes].sort((a, b) => a - b));
	});

	test("the first two moves are downloaded before the page shows", () => {
		const gate = loadPlan(wide).filter((f) => f.scene < GATE);
		expect(gate.filter((f) => f.kind === "move").map((f) => f.index)).toEqual([
			1, 2,
		]);
	});

	test("reduced motion loads still frames only", () => {
		const calm = loadPlan({ ...wide, calm: true });
		expect(calm.every((f) => f.kind === "still")).toBe(true);
		expect(calm).toHaveLength(SCENE_COUNT);
	});

	test("4K loops only for AV1 on big screens; Safari keeps its HEVC files", () => {
		expect(storyUrls({ ...wide, big: true }).loop(2)).toBe(
			`${MEDIA_BASE}/loop-w2-4k.mp4`
		);
		expect(storyUrls({ ...wide, big: true, codec: "-hevc" }).loop(2)).toBe(
			`${MEDIA_BASE}/loop-w2-hevc.mp4`
		);
	});
});

describe("resting", () => {
	test("computers loop every scene", () => {
		const wide: Screen = { big: false, calm: false, codec: "", tall: false };
		expect(SCENES.map((i) => restsOnLoop(wide, i))).toEqual(
			SCENES.map(() => true)
		);
	});

	test("phones rest on stills for the moon, Saturn, ocean and goodnight", () => {
		const phone: Screen = { big: false, calm: false, codec: "", tall: true };
		expect(SCENES.map((i) => restsOnLoop(phone, i))).toEqual([
			true,
			true,
			false,
			false,
			false,
			true,
			false,
		]);
	});
});

describe("dots", () => {
	test("the question, then the adventure, then goodnight", () => {
		expect(SCENES.map(litDot)).toEqual([0, 0, 1, 1, 1, 1, 2]);
	});

	test("the adventure dot fills world by world and is full on the last world", () => {
		const fills = [2, 3, 4, 5].map((scene) => dotFill(1, scene));
		expect(fills).toEqual([...fills].sort((a, b) => a - b));
		expect(fills.at(-1)).toBe(1);
		expect([0, 1, 2].map((dot) => dotFill(dot, 6))).toEqual([1, 1, 1]);
	});
});
