// Where everything stands on the sideways map's 852 x 393 stage (an iPhone turned sideways). Pure
// numbers, no components, so the star's stops can be tested. fork-map.tsx draws from these.
import type { MapNode } from "./story-map";

export interface Point {
	x: number;
	y: number;
}

export const STAGE = { height: 393, width: 852 } as const;
export const STAR = 46;
/** The tall lanes: the top lane carries its names above, the bottom lane below. */
export const TOP_LANE = 150;
export const BOTTOM_LANE = 246;
export const MID_LANE = 198;
export const SAFE_X = 59;
export const BAR_TOP = 14;

/** The centre of each place (and of the goodnight). */
export const SPOTS: Record<MapNode, Point> = {
	intro: { x: 119, y: MID_LANE },
	outro: { x: 716, y: MID_LANE },
	p1: { x: 318, y: TOP_LANE },
	p1a: { x: 517, y: TOP_LANE },
	p2: { x: 318, y: BOTTOM_LANE },
	p2a: { x: 517, y: BOTTOM_LANE },
};

/**
 * Road geometry by road id (`from-to`): one line (`M x,y L x,y`) or one cubic
 * (`M x,y C x,y x,y x,y`). The app owns which roads exist and which are lit.
 */
export const ROAD_PATHS: Record<string, string> = {
	"intro-p1": "M155,198 C215,198 222,150 282,150",
	"intro-p2": "M155,198 C215,198 222,246 282,246",
	"p1-p1a": "M354,150 L481,150",
	"p1-p2": "M318,186 L318,210",
	"p1a-outro": "M553,150 C610,150 604,198 664,198",
	"p1a-p2a": "M517,186 L517,210",
	"p2-p2a": "M354,246 L481,246",
	"p2a-outro": "M553,246 C610,246 604,198 664,198",
};

/** The id of the road between two nodes, whichever way round they are given. */
export const idOf = (a: MapNode, b: MapNode) => {
	const forward = `${a}-${b}`;
	return forward in ROAD_PATHS ? forward : `${b}-${a}`;
};

/**
 * Where the star's centre rests, from the centre of the place it is at: on the medallion's upper
 * right shoulder. The same at every stop, the goodnight included.
 */
const STAND = { x: 30, y: -22 };

/** The top-left corner of the star when its centre is at `centre` + the resting offset. */
const cornerFor = (centre: Point): Point => ({
	x: centre.x + STAND.x - STAR / 2,
	y: centre.y + STAND.y - STAR / 2,
});

/** The top-left corner of the star resting at a place. */
export const standAt = (node: MapNode): Point => cornerFor(SPOTS[node]);

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
		points.push(...hopsAlong(run).map(cornerFor), standAt(to));
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
