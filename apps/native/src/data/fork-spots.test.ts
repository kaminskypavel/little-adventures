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
const PLACES = NODES.filter((node) => node !== "outro");
const centreOf = (node: (typeof NODES)[number]) => ({
	x: standAt(node).x + STAR / 2 - SPOTS[node].x,
	y: standAt(node).y + STAR / 2 - SPOTS[node].y,
});

describe("standAt", () => {
	test("the star rests at the same offset from every place", () => {
		const [first, ...rest] = PLACES.map(centreOf);
		for (const offset of rest) {
			expect(offset).toEqual(first as { x: number; y: number });
		}
		expect(first).toEqual({ x: 33, y: -14 });
	});

	test("the goodnight's gate is bigger, so the star stands higher and out", () => {
		expect(centreOf("outro")).toEqual({ x: 34, y: -36 });
	});

	test("the star rests on the medallion's shoulder, not out on the road", () => {
		const { x, y } = centreOf("p1");
		// Within one medallion width of the centre (the here medallion is 72 across).
		expect(Math.hypot(x, y) < 72).toBe(true);
	});
});

describe("the lanes", () => {
	test("places stand where the approved map draws them", () => {
		expect(SPOTS).toEqual({
			intro: { x: 119, y: 206 },
			outro: { x: 716, y: 206 },
			p1: { x: 312, y: 150 },
			p1a: { x: 505, y: 150 },
			p2: { x: 312, y: 262 },
			p2a: { x: 505, y: 262 },
		});
	});

	test("every road starts and ends at a medallion's edge", () => {
		const numbers = (id: string) =>
			(ROAD_PATHS[id] ?? "").match(/-?\d+(?:\.\d+)?/gu)?.map(Number) ?? [];
		for (const id of Object.keys(ROAD_PATHS)) {
			const [a, b] = id.split("-") as [
				(typeof NODES)[number],
				(typeof NODES)[number],
			];
			const [x0, y0, ...rest] = numbers(id);
			const [x1, y1] = rest.slice(-2);
			const near = (node: (typeof NODES)[number], x?: number, y?: number) =>
				Math.hypot((x ?? 0) - SPOTS[node].x, (y ?? 0) - SPOTS[node].y);
			// 32 pt radius plus the gap the road leaves; the goodnight gate is wider.
			expect(near(a, x0, y0) >= 32 && near(a, x0, y0) <= 40).toBe(true);
			expect(near(b, x1, y1) >= 32 && near(b, x1, y1) <= 52).toBe(true);
		}
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
