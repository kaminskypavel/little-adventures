import { describe, expect, test } from "bun:test";
import {
	ROAD_PATHS,
	SPOTS,
	STAR,
	standAt,
	topRightCorner,
	walkPoints,
} from "../../../../packages/native-ui/src/fork-spots";

const NODES = ["intro", "p1", "p2", "p1a", "p2a", "outro"] as const;
const centreOf = (node: (typeof NODES)[number]) => ({
	x: standAt(node).x + STAR / 2 - SPOTS[node].x,
	y: standAt(node).y + STAR / 2 - SPOTS[node].y,
});

describe("standAt", () => {
	test("the star rests at the same offset from every place, the goodnight too", () => {
		const [first, ...rest] = NODES.map(centreOf);
		for (const offset of rest) {
			expect(offset).toEqual(first as { x: number; y: number });
		}
	});

	test("the star rests on the medallion's shoulder, not out on the road", () => {
		const { x, y } = centreOf("p1");
		// Within one medallion width of the centre (the here medallion is 72 across).
		expect(Math.hypot(x, y) < 72).toBe(true);
	});
});

describe("walkPoints", () => {
	test("one place is one point: the star at rest", () => {
		expect(walkPoints(["p1"])).toEqual({ points: [standAt("p1")], stops: [0] });
	});

	test("a walk starts and ends exactly at rest", () => {
		const { points, stops } = walkPoints(["p1", "p1a"]);
		expect(points[0]).toEqual(standAt("p1"));
		expect(points.at(-1)).toEqual(standAt("p1a"));
		expect(stops).toEqual([0, points.length - 1]);
	});

	test("the star hops along the road, not straight across", () => {
		const { points } = walkPoints(["intro", "p1"]);
		expect(points.length > 2).toBe(true);
		// The first road bends: the middle hops do not sit on the straight line between the places.
		const [from, to] = [standAt("intro"), standAt("p1")];
		const off = points.slice(1, -1).some((p) => {
			const t = (p.x - from.x) / (to.x - from.x);
			return Math.abs(from.y + (to.y - from.y) * t - p.y) > 3;
		});
		expect(off).toBe(true);
	});

	test("a longer route passes each place, in order", () => {
		const { points, stops } = walkPoints(["p1a", "p1", "p2"]);
		expect(stops.length).toBe(3);
		expect(points[stops[1] as number]).toEqual(standAt("p1"));
		expect(points[stops[2] as number]).toEqual(standAt("p2"));
	});

	test("every road can be walked both ways", () => {
		for (const id of Object.keys(ROAD_PATHS)) {
			const [a, b] = id.split("-") as [
				(typeof NODES)[number],
				(typeof NODES)[number],
			];
			const there = walkPoints([a, b]).points;
			const back = walkPoints([b, a]).points;
			expect(there.at(-1)).toEqual(standAt(b));
			expect(back.at(-1)).toEqual(standAt(a));
			expect(back.length).toBe(there.length);
		}
	});

	test("an empty route is no walk", () => {
		expect(walkPoints([])).toEqual({ points: [], stops: [] });
	});
});

describe("topRightCorner", () => {
	test("on the stage's own size it is the old lock corner", () => {
		expect(topRightCorner(852, 393)).toEqual({ right: 55, top: 14 });
	});

	test("on a taller screen the stage is centred and scaled", () => {
		const { right, top } = topRightCorner(426, 400);
		// Scale 0.5: the stage is 426 x 196.5, centred vertically in 400.
		expect(right).toBe(27.5);
		expect(top).toBe((400 - 196.5) / 2 + 7);
	});
});
