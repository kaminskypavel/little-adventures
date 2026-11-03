// Where everything stands on the sideways map's 852 x 393 stage (an iPhone turned sideways). Pure
// numbers, no components, so the star's stops can be tested. fork-map.tsx draws from these.
import type { MapNode } from "./story-map";

export interface Point {
	x: number;
	y: number;
}

export const STAGE = { height: 393, width: 852 } as const;
export const STAR = 46;
/** The tall lanes: the top lane carries its plates above, the bottom lane below. */
export const TOP_LANE = 150;
export const BOTTOM_LANE = 262;
export const MID_LANE = 206;
export const SAFE_X = 59;
export const BAR_TOP = 14;

/** The centre of each place (and of the goodnight). */
export const SPOTS: Record<MapNode, Point> = {
	intro: { x: 119, y: MID_LANE },
	outro: { x: 716, y: MID_LANE },
	p1: { x: 312, y: TOP_LANE },
	p1a: { x: 505, y: TOP_LANE },
	p2: { x: 312, y: BOTTOM_LANE },
	p2a: { x: 505, y: BOTTOM_LANE },
};

/**
 * Road geometry by road id (`from-to`): one line (`M x,y L x,y`) or one cubic
 * (`M x,y C x,y x,y x,y`). The app owns which roads exist and which are lit.
 */
export const ROAD_PATHS: Record<string, string> = {
	"intro-p1": "M155,206 C213,206 216,150 276,150",
	"intro-p2": "M155,206 C213,206 216,262 276,262",
	"p1-p1a": "M348,150 L469,150",
	"p1-p2": "M312,184 L312,228",
	"p1a-outro": "M541,150 C600,150 604,206 664,206",
	"p1a-p2a": "M505,184 L505,228",
	"p2-p2a": "M348,262 L469,262",
	"p2a-outro": "M541,262 C600,262 604,206 664,206",
};

/** The id of the road between two nodes, whichever way round they are given. */
export const idOf = (a: MapNode, b: MapNode) => {
	const forward = `${a}-${b}`;
	return forward in ROAD_PATHS ? forward : `${b}-${a}`;
};

/**
 * Where the star's centre rests, from the centre of the place it is at: on the medallion's upper
 * right shoulder. The same at every place; the goodnight's gate is bigger, so the star stands
 * higher and a little further out.
 */
const STAND: Point = { x: 33, y: -14 };
const STAND_GOODNIGHT: Point = { x: 34, y: -36 };

const standOf = (node: MapNode): Point =>
	node === "outro" ? STAND_GOODNIGHT : STAND;

/** The top-left corner of the star when its centre is at `centre` + the resting offset. */
const cornerFor = (centre: Point, stand: Point): Point => ({
	x: centre.x + stand.x - STAR / 2,
	y: centre.y + stand.y - STAR / 2,
});

/** The top-left corner of the star resting at a place. */
export const standAt = (node: MapNode): Point =>
	cornerFor(SPOTS[node], standOf(node));

const NUMBER = /-?\d+(?:\.\d+)?/gu;
const ROAD_SAMPLES = 24;
/** About how far the star travels in one hop along a road, in stage points. */
const HOP_REACH = 55;

const mix = (a: Point, b: Point, t: number): Point => ({
	x: a.x + (b.x - a.x) * t,
	y: a.y + (b.y - a.y) * t,
});

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** De Casteljau: the point at `t` on the line (2 points) or cubic (4 points) through `points`. */
function bezierAt(points: Point[], t: number): Point {
	let level = points;
	while (level.length > 1) {
		const prev = level;
		level = prev.slice(1).map((p, i) => mix(prev[i] as Point, p, t));
	}
	return level[0] ?? { x: 0, y: 0 };
}

/** The road between two places as a run of points, the way the star walks it (from -> to). */
function roadPoints(from: MapNode, to: MapNode): Point[] {
	const id = idOf(from, to);
	const numbers = (ROAD_PATHS[id] ?? "").match(NUMBER)?.map(Number) ?? [];
	const corners: Point[] = [];
	for (let i = 0; i + 1 < numbers.length; i += 2) {
		corners.push({ x: numbers[i] ?? 0, y: numbers[i + 1] ?? 0 });
	}
	const run = Array.from({ length: ROAD_SAMPLES + 1 }, (_, i) =>
		bezierAt(corners, i / ROAD_SAMPLES)
	);
	return id === `${from}-${to}` ? run : run.reverse();
}

/** Points at equal distances along a run of points: the stops between its two ends. */
function hopsAlong(run: Point[]): Point[] {
	const legs = run.slice(1).map((p, i) => distance(run[i] as Point, p));
	const total = legs.reduce((sum, length) => sum + length, 0);
	const hops = Math.max(1, Math.round(total / HOP_REACH));
	const stops: Point[] = [];
	let leg = 0;
	let before = 0;
	for (let hop = 1; hop < hops; hop += 1) {
		const target = (total * hop) / hops;
		while (leg < legs.length - 1 && before + (legs[leg] ?? 0) < target) {
			before += legs[leg] ?? 0;
			leg += 1;
		}
		const length = legs[leg] || 1;
		stops.push(
			mix(run[leg] as Point, run[leg + 1] as Point, (target - before) / length)
		);
	}
	return stops;
}

/**
 * The star's walk through `route` (the places it passes, the first being where it stands): the
 * top-left corner of the star at each hop, going along the roads from one place to the next, and
 * `stops`, the index in `points` of each place of the route. Starts and ends exactly at rest.
 */
export function walkPoints(route: readonly MapNode[]): {
	points: Point[];
	stops: number[];
} {
	const [first] = route;
	if (!first) {
		return { points: [], stops: [] };
	}
	const points = [standAt(first)];
	const stops = [0];
	for (const [index, to] of route.slice(1).entries()) {
		const from = route[index] as MapNode;
		const run = [SPOTS[from], ...roadPoints(from, to), SPOTS[to]];
		// The resting offset eases from the one place's to the other's along the walk.
		const hops = hopsAlong(run);
		points.push(
			...hops.map((p, i) =>
				cornerFor(
					p,
					mix(standOf(from), standOf(to), (i + 1) / (hops.length + 1))
				)
			),
			standAt(to)
		);
		stops.push(points.length - 1);
	}
	return { points, stops };
}

/**
 * Where a button in the stage's top right corner (where the lock sat) is on a screen of this size:
 * the stage is scaled to fit and centred. `right` and `top` are screen points.
 */
export function topRightCorner(width: number, height: number) {
	const scale = Math.min(width / STAGE.width, height / STAGE.height);
	return {
		right: (width - STAGE.width * scale) / 2 + (SAFE_X - 4) * scale,
		top: (height - STAGE.height * scale) / 2 + BAR_TOP * scale,
	};
}
