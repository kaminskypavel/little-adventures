import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { dropShadow } from "./drop-shadow";
import { FallbackImage } from "./fallback-image";
import { Medallion, type MedallionState } from "./medallion";
import { useCalm } from "./motion-provider";
import { Plate } from "./plate";
import { SealedDisc } from "./sealed-disc";
import { SteppingStone } from "./stepping-stone";
import {
	flat,
	layout,
	mapMedallion,
	mapSeal,
	motion,
	shadows,
	spacing,
} from "./tokens";
import { Walker, type WalkerPoint, walkerSize } from "./walker";

export type MapNode = "intro" | "p1" | "p2" | "p1a" | "p2a" | "outro";
export type MapPlaceNode = Exclude<MapNode, "outro">;

export interface MapPlace {
	/** The plate: only the place the star stands on and the places that can be walked to next. */
	label: boolean;
	/** What the plate says instead of the name: the place's question, or its answer once visited. */
	lesson?: { kind: "answer" | "question"; text: string };
	name: string;
	/** Absent for places that do nothing but feel pressed (drawing, not reachable). */
	onPress?: () => void;
	picture: ImageSource | number | null;
	/** The place just opened from its seal for the first time: it pops in once. */
	reveal?: boolean;
	state: MedallionState;
}

export interface MapGoodnight {
	/** The end goal asset made for the question: closed gate, or open once goodnight unlocks. */
	image: ImageSource | number | null;
	locked: boolean;
	name: string;
}

// ---------------------------------------------------------------------------------------------
// Round 7 geometry. Round 7 draws the map phone 282 x 632 px (a point is 1 / 0.72 of a px). The
// numbers below are round 7's own px values, kept as drawn so each one traces to its element.
// Dimming and the end-map frame have no token yet: they stay here until the design tokens take them.
// ---------------------------------------------------------------------------------------------

const DRAWN_WIDTH = 282;
const DRAWN_PT = 1 / 0.72;
/**
 * Round 7 px where the top bar ends and where the map ends: the map lives between them. Round 7
 * ends at 542 (the dock); with the rows raised, the start's name ends near 508.
 */
const ZONE_TOP = 98;
const ZONE_BOTTOM = 508;
/** Points kept clear above and below the map inside the band. */
const BAND_MARGIN = 18;

const MEADOW = require("../assets/map/meadow.jpg");
const MEADOW_RATIO = 1688 / 780;

/** Round 7 `.shade` on screen 11: heavier at the top and bottom edges. */
const mapDim = {
	colors: [
		"rgba(10,22,44,0.62)",
		"rgba(10,22,44,0.3)",
		"rgba(10,22,44,0.3)",
		"rgba(10,22,44,0.62)",
	],
	locations: [0, 0.22, 0.74, 1],
} as const;

/**
 * Place centers. `outro` is the foot of the gate, where the star stops. The rows sit higher than
 * round 7 drew them (the user's call, 2026-11-02): the upper pair beside the goodnight hill, so the
 * start has room for its name under it.
 */
const NODES: Record<MapNode, { x: number; y: number }> = {
	intro: { x: 141, y: 440 },
	outro: { x: 141, y: 215 },
	p1: { x: 50, y: 340 },
	p1a: { x: 50, y: 222 },
	p2: { x: 232, y: 340 },
	p2a: { x: 232, y: 222 },
};

/** Round 7 `.stone` elements of screen 11, in markup order. Widths are pt (34 px, 30 px). */
const STONES = [
	{ rotate: 24, variant: 2, width: 47, x: 109.2, y: 397.8 },
	{ rotate: 30, variant: 2, width: 47, x: 172.8, y: 397.8 },
	{ rotate: -11, variant: 3, width: 47, x: 106.9, y: 352.5 },
	{ rotate: 30, variant: 1, width: 42, x: 143.3, y: 354.6 },
	{ rotate: -12, variant: 2, width: 47, x: 179.7, y: 352.0 },
	{ rotate: 22, variant: 1, width: 42, x: 50, y: 278.1 },
	{ rotate: -17, variant: 2, width: 47, x: 232, y: 281.0 },
	{ rotate: 33, variant: 1, width: 42, x: 97.8, y: 296.0 },
	{ rotate: -30, variant: 3, width: 47, x: 141, y: 264.3 },
	{ rotate: 15, variant: 3, width: 47, x: 177.4, y: 243.3 },
	{ rotate: -15, variant: 2, width: 47, x: 186.5, y: 297.9 },
	{ rotate: -34, variant: 3, width: 47, x: 104.6, y: 243.3 },
	{ rotate: -27, variant: 3, width: 47, x: 110.4, y: 220.0 },
	{ rotate: -31, variant: 1, width: 42, x: 171.6, y: 220.0 },
] as const;

interface Road {
	from: MapNode;
	stones: readonly number[];
	to: MapNode;
}

/** The nine roads and the stones laid along each, from `from` to `to` (indexes into STONES). */
const ROADS: readonly Road[] = [
	{ from: "intro", stones: [0], to: "p1" },
	{ from: "intro", stones: [1], to: "p2" },
	{ from: "p1", stones: [2, 3, 4], to: "p2" },
	{ from: "p1", stones: [5], to: "p1a" },
	{ from: "p2", stones: [6], to: "p2a" },
	// The two cross roads share stone 8 in the middle.
	{ from: "p1", stones: [7, 8, 9], to: "p2a" },
	{ from: "p2", stones: [10, 8, 11], to: "p1a" },
	{ from: "p1a", stones: [12], to: "outro" },
	{ from: "p2a", stones: [13], to: "outro" },
];

/** The star stands up and to the left of a place center (round 7 `.walker`: 18 px, 352 px at p1). */
const STAND = { x: -44, y: -67 };

/** Round 7 `.goodnight`: 88 px wide on a 422 x 500 gate, its foot at y 200. */
const GOAL_HEIGHT = ((88 * 500) / 422) * DRAWN_PT;
const GOAL_FOOT = 200;
const GOAL_X = 141;

/**
 * Where each plate sits: below both rows (above the upper row they would cover the goodnight
 * plate once every place is named), to the right of the box.
 */
const PLATE_SIDE: Record<MapPlaceNode, "above" | "below" | "right"> = {
	intro: "below",
	p1: "below",
	p1a: "below",
	p2: "below",
	p2a: "below",
};

const PLACE_NODES = ["intro", "p1", "p2", "p1a", "p2a"] as const;

const stateHint: Record<MedallionState, string> = {
	default: "",
	done: ", done",
	drawing: ", not drawn yet",
	here: ", you are here",
	ready: "",
};

// ---------------------------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------------------------

type Stop = { node: MapNode } | { stone: number };

const otherEnd = (road: Road, at: MapNode): MapNode | null => {
	if (road.from === at) {
		return road.to;
	}
	return road.to === at ? road.from : null;
};

const roadBetween = (a: MapNode, b: MapNode) =>
	ROADS.find((road) => otherEnd(road, a) === b);

/** Fewest roads from `from` to `to`. The gate is only ever the last stop. */
function nodeRoute(from: MapNode, to: MapNode): MapNode[] {
	const before = new Map<MapNode, MapNode>([[from, from]]);
	const queue: MapNode[] = [from];
	for (let at = queue.shift(); at && !before.has(to); at = queue.shift()) {
		for (const road of ROADS) {
			const other = otherEnd(road, at);
			if (other && !before.has(other) && (other !== "outro" || other === to)) {
				before.set(other, at);
				queue.push(other);
			}
		}
	}
	const route: MapNode[] = [];
	for (let at = before.has(to) ? to : undefined; at; at = before.get(at)) {
		route.unshift(at);
		if (at === from) {
			return route;
		}
	}
	return [from];
}

/** Every stop on the way: the start, then each stone and place along the roads. */
function stopsBetween(from: MapNode, to: MapNode): Stop[] {
	const stops: Stop[] = [{ node: from }];
	let prev = from;
	for (const node of nodeRoute(from, to).slice(1)) {
		const road = roadBetween(prev, node);
		if (road) {
			const stones =
				road.from === prev ? road.stones : [...road.stones].reverse();
			for (const stone of stones) {
				stops.push({ stone });
			}
		}
		stops.push({ node });
		prev = node;
	}
	return stops;
}

const stoneOf = (stop: Stop) => ("stone" in stop ? stop.stone : null);

// ---------------------------------------------------------------------------------------------
// Stepping leaves: a clay leaf on every stone position, faint unless it lies on a road ahead
// ---------------------------------------------------------------------------------------------

/** Width of a leaf in pt; it keeps the center of the round 7 stone it replaces. */
const LEAF_WIDTH = 22;
/** Leaves on roads the child cannot take next. */
const FAINT = 0.15;

interface Leaf {
	/** Width / height of the cut-out. */
	ratio: number;
	source: number;
}

/** One leaf per stone variant 1 to 3: a lily pad, an oval leaf, a heart leaf. */
const LEAVES: readonly [Leaf, Leaf, Leaf] = [
	{ ratio: 184 / 176, source: require("../assets/map/leaf-1.png") },
	{ ratio: 135 / 184, source: require("../assets/map/leaf-2.png") },
	{ ratio: 184 / 175, source: require("../assets/map/leaf-3.png") },
];

/** The stones on roads from `here` to a place the child can go to next. */
function nextStones(here: MapNode, next: readonly MapNode[]): Set<number> {
	const roads = ROADS.filter((road) => {
		const other = otherEnd(road, here);
		return other !== null && next.includes(other);
	});
	return new Set(roads.flatMap((road) => road.stones));
}

// ---------------------------------------------------------------------------------------------
// Frame: round 7 px to this screen's points
// ---------------------------------------------------------------------------------------------

interface Frame {
	x: (px: number) => number;
	y: (px: number) => number;
}

/**
 * The map is drawn for a 390 pt wide phone: x scales with the width. y scales the same, but is
 * squeezed when the band between the top bar and the dock is shorter than it was drawn, and the
 * composition is centered when the band is taller.
 */
function makeFrame(width: number, height: number): Frame {
	const across = width / DRAWN_WIDTH;
	const drawn = ZONE_BOTTOM - ZONE_TOP;
	// Round 7 fills the band to its edges; keep the goal off the top bar and the start off the dock.
	const down = Math.min(across, (height - 2 * BAND_MARGIN) / drawn);
	const top = (height - drawn * down) / 2;
	return {
		x: (px) => px * across,
		y: (px) => top + (px - ZONE_TOP) * down,
	};
}

function spot(frame: Frame, stop: Stop): WalkerPoint {
	const at =
		"stone" in stop
			? (STONES[stop.stone] as (typeof STONES)[number])
			: NODES[stop.node];
	return { x: frame.x(at.x), y: frame.y(at.y) };
}

function stand(point: WalkerPoint): WalkerPoint {
	return { x: point.x + STAND.x, y: point.y + STAND.y };
}

// ---------------------------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------------------------

/** Full-bleed meadow with the round 7 dim. Render it under `Screen`, not inside. */
export function MapBackdrop() {
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Image
				accessibilityIgnoresInvertColors
				contentFit="cover"
				source={MEADOW}
				style={StyleSheet.absoluteFill}
			/>
			<LinearGradient
				colors={mapDim.colors}
				locations={mapDim.locations}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
}

// The drop shadow follows the cut-out's shape.
export const goalShadow = dropShadow(shadows.character);
const moonShadow = dropShadow(shadows.walker);

/**
 * The end goal cut-out, `height` tall, its foot and center at (`x`, `y`). The assets are portrait or
 * square, so a square box of that height holds any of them at full height.
 */
export function Goal({
	height,
	image,
	kind,
	shadow,
	x,
	y,
}: {
	height: number;
	image: ImageSource | number | null;
	kind: "goalClosed" | "goalOpen";
	shadow: ViewStyle;
	x: number;
	y: number;
}) {
	return (
		<View
			pointerEvents="none"
			style={[
				{
					height,
					left: x - height / 2,
					position: "absolute",
					top: y - height,
					width: height,
				},
				shadow,
			]}
		>
			<FallbackImage
				accessibilityIgnoresInvertColors
				contentFit="contain"
				kind={kind}
				source={image}
				style={{ height: "100%", width: "100%" }}
			/>
		</View>
	);
}

/** A plate that stays inside the screen margins, wherever its place sits. */
function MapPlate({
	boxWidth,
	edge,
	icon,
	label,
	lesson = false,
	tone,
	top,
	x,
}: {
	boxWidth: number;
	/** `center`: `x` is the plate's middle. `left`: `x` is its left edge. */
	edge: "center" | "left";
	icon?: "lock";
	label: string;
	/** Two lines of small type: a question or an answer. */
	lesson?: boolean;
	tone?: "dim" | "sand" | "sun";
	top: number;
	x: number;
}) {
	const [width, setWidth] = useState(0);
	const start = edge === "center" ? x - width / 2 : x;
	const left = Math.min(
		Math.max(start, spacing.sm),
		boxWidth - spacing.sm - width
	);
	return (
		<View
			pointerEvents="none"
			style={{ left: 0, position: "absolute", right: 0, top }}
		>
			<View
				onLayout={(event: LayoutChangeEvent) =>
					setWidth(event.nativeEvent.layout.width)
				}
				style={{
					alignSelf: "flex-start",
					marginLeft: left,
					opacity: width > 0 ? 1 : 0,
				}}
			>
				<Plate
					icon={icon}
					label={label}
					tone={tone}
					variant={lesson ? "lesson" : "place"}
				/>
			</View>
		</View>
	);
}

function Stones({
	ahead,
	frame,
	lit,
}: {
	/** Stones on the roads ahead: full strength. */
	ahead: ReadonlySet<number>;
	frame: Frame;
	lit: ReadonlySet<number>;
}) {
	// SteppingStone centers itself on (left, top), so a smaller leaf keeps the stone's center.
	return STONES.map((stone, index) => (
		<SteppingStone
			active={lit.has(index)}
			art={LEAVES[stone.variant - 1]}
			key={`${stone.x}-${stone.y}`}
			rotate={stone.rotate}
			style={{
				left: frame.x(stone.x),
				opacity: ahead.has(index) ? 1 : FAINT,
				position: "absolute",
				top: frame.y(stone.y),
			}}
			variant={stone.variant}
			width={LEAF_WIDTH}
		/>
	));
}

function Places({
	frame,
	places,
	walking,
}: {
	frame: Frame;
	places: Record<MapPlaceNode, MapPlace>;
	walking: boolean;
}) {
	return PLACE_NODES.map((node) => {
		const place = places[node];
		const size =
			place.state === "here" ? mapMedallion.sizeHere : mapMedallion.size;
		// Not reachable yet: the same sealed disc as the sideways map.
		if (place.state === "default") {
			return (
				<SealedDisc
					key={node}
					style={{
						left: frame.x(NODES[node].x) - mapSeal.size / 2,
						position: "absolute",
						top: frame.y(NODES[node].y) - mapSeal.size / 2,
					}}
				/>
			);
		}
		return (
			<Medallion
				accessibilityLabel={`${place.name}${stateHint[place.state]}`}
				key={node}
				onPress={walking ? undefined : place.onPress}
				picture={place.picture}
				size={size}
				state={place.state}
				style={{
					left: frame.x(NODES[node].x) - size / 2,
					position: "absolute",
					top: frame.y(NODES[node].y) - size / 2,
				}}
			/>
		);
	});
}

function Plates({
	frame,
	goalTop,
	goodnight,
	places,
	width,
}: {
	frame: Frame;
	goalTop: number;
	goodnight: MapGoodnight;
	places: Record<MapPlaceNode, MapPlace>;
	width: number;
}) {
	const gap = spacing.xs;
	const { lesson, place: single } = flat.plate;
	// Two lines of small type, with their padding.
	const lessonHeight = 2 * lesson.size * lesson.lineHeight + 2 * lesson.padY;
	return (
		<>
			{PLACE_NODES.filter((node) => places[node].label).map((node) => {
				const place = places[node];
				const size =
					place.state === "here" ? mapMedallion.sizeHere : mapMedallion.size;
				const cx = frame.x(NODES[node].x);
				const cy = frame.y(NODES[node].y);
				const side = PLATE_SIDE[node];
				const height = place.lesson ? lessonHeight : single.height;
				let top = cy + size / 2 + gap;
				if (side === "above") {
					top = cy - size / 2 - gap - height;
				} else if (side === "right") {
					top = cy - height / 2;
				}
				return (
					<MapPlate
						boxWidth={width}
						edge={side === "right" ? "left" : "center"}
						key={node}
						label={place.lesson?.text ?? place.name}
						lesson={Boolean(place.lesson)}
						tone={place.lesson?.kind === "answer" ? "sun" : undefined}
						top={top}
						x={side === "right" ? cx + size / 2 + gap : cx}
					/>
				);
			})}
			<MapPlate
				boxWidth={width}
				edge="center"
				icon={goodnight.locked ? "lock" : undefined}
				label={goodnight.name}
				top={goalTop + gap}
				x={frame.x(GOAL_X)}
			/>
		</>
	);
}

/**
 * The hub (screen 11): stepping leaves, the five place medallions, the goodnight node and the
 * walking star, drawn between the top bar and the dock. It paints no background: put
 * `MapBackdrop` under the screen. It is as wide as the screen, whatever side margin the body has.
 * `walkTo` plays the walk from `here`, lighting each stone as the star passes, then `onWalked`.
 */
export function StoryMap({
	glowFrom,
	goodnight,
	hideStar = false,
	here,
	next,
	onWalked,
	places,
	walkTo,
}: {
	/** The place walked from to reach `here`: the road between them glows. */
	glowFrom?: MapNode;
	goodnight: MapGoodnight;
	/** No star yet: nothing has been walked, so it is not out until the first place is tapped. */
	hideStar?: boolean;
	/** Where the star stands. */
	here: MapNode;
	/** The places the child can go to next: the roads to them stay at full strength. */
	next: readonly MapNode[];
	onWalked: () => void;
	places: Record<MapPlaceNode, MapPlace>;
	walkTo?: MapNode;
}) {
	const calm = useCalm();
	const [box, setBox] = useState({ height: 0, width: 0 });
	const [landed, setLanded] = useState(0);
	const frame = makeFrame(box.width, box.height);
	const measured = box.width > 0;

	const stops = useMemo(
		() => (walkTo && walkTo !== here ? stopsBetween(here, walkTo) : []),
		[here, walkTo]
	);
	const walking = stops.length > 1;
	const walked = useRef(onWalked);
	useLayoutEffect(() => {
		walked.current = onWalked;
	}, [onWalked]);
	// Already standing at the place: nothing to walk, open it.
	useEffect(() => {
		if (walkTo && !walking && measured) {
			walked.current();
		}
	}, [walkTo, walking, measured]);

	const route = useMemo(() => {
		const f = makeFrame(box.width, box.height);
		if (hideStar) {
			return [];
		}
		return walking
			? stops.map((stop) => stand(spot(f, stop)))
			: [stand(spot(f, { node: here }))];
	}, [box, here, hideStar, stops, walking]);

	const lit = new Set<number>();
	const glowing = walking
		? stops.slice(1, landed + 1)
		: stopsBetween(glowFrom ?? here, here);
	for (const stop of glowing) {
		const stone = stoneOf(stop);
		if (stone !== null) {
			lit.add(stone);
		}
	}

	const goalHeight = GOAL_HEIGHT;
	const goalFoot = frame.y(GOAL_FOOT);

	return (
		<Animated.View
			entering={FadeIn.duration(
				calm ? motion.reducedReveal : motion.enter
			).reduceMotion(ReduceMotion.Never)}
			onLayout={(event: LayoutChangeEvent) => {
				const { height, width } = event.nativeEvent.layout;
				setBox((prev) =>
					prev.height === height && prev.width === width
						? prev
						: { height, width }
				);
			}}
			pointerEvents="box-none"
			style={styles.map}
		>
			{measured ? (
				<>
					<Stones ahead={nextStones(here, next)} frame={frame} lit={lit} />
					<Goal
						height={goalHeight}
						image={goodnight.image}
						kind={goodnight.locked ? "goalClosed" : "goalOpen"}
						shadow={goalShadow}
						x={frame.x(GOAL_X)}
						y={goalFoot}
					/>
					<Places frame={frame} places={places} walking={walking} />
					<Plates
						frame={frame}
						goalTop={goalFoot}
						goodnight={goodnight}
						places={places}
						width={box.width}
					/>
					<Walker
						onDone={onWalked}
						onLand={(index) => setLanded((n) => Math.max(n, index))}
						route={route}
						size={walkerSize}
					/>
				</>
			) : null}
		</Animated.View>
	);
}

// ---------------------------------------------------------------------------------------------
// The end map (screen 16): the same map, small, inset in a rounded frame, every place walked.
// Round 7 `.endmap`: 250 px square, the meadow shifted up 130 px, a lighter dim, plain medallions.
// ---------------------------------------------------------------------------------------------

const END_DRAWN = 250;
const END_RADIUS = 39;
const END_MEADOW_TOP = -130;
const END_DIM = "rgba(10,22,44,0.28)";
const END_MEDAL = 38;
const END_GOAL = { foot: 88, ratio: 500 / 365, width: 56, x: 125 };

const END_NODES: Record<MapPlaceNode, { x: number; y: number }> = {
	intro: { x: 125, y: 224 },
	p1: { x: 40, y: 184 },
	p1a: { x: 40, y: 132 },
	p2: { x: 210, y: 184 },
	p2a: { x: 210, y: 132 },
};

/** Round 7 `.stone` elements inside `.endmap`, in markup order. Widths are px of the 250 frame. */
const END_STONES = [
	{ rotate: 24, variant: 2, width: 19, x: 92.1, y: 205.6 },
	{ rotate: 30, variant: 2, width: 19, x: 74, y: 197.1 },
	{ rotate: -11, variant: 3, width: 19, x: 157.9, y: 205.6 },
	{ rotate: 30, variant: 1, width: 16, x: 176, y: 197.1 },
	{ rotate: -12, variant: 2, width: 19, x: 86.8, y: 190.1 },
	{ rotate: 22, variant: 1, width: 16, x: 125, y: 191.7 },
	{ rotate: -17, variant: 2, width: 19, x: 165.4, y: 190 },
	{ rotate: 33, variant: 1, width: 16, x: 84.6, y: 163.1 },
	{ rotate: -30, variant: 3, width: 19, x: 125, y: 148.7 },
	{ rotate: 15, variant: 3, width: 19, x: 165.4, y: 138.4 },
	{ rotate: -15, variant: 2, width: 19, x: 165.4, y: 163.1 },
	{ rotate: -34, variant: 3, width: 19, x: 84.6, y: 138.4 },
	{ rotate: -27, variant: 3, width: 19, x: 93.7, y: 119 },
	{ rotate: -31, variant: 1, width: 16, x: 156.3, y: 119 },
] as const;

/** Fills the width it is given and is square. Medallions are plain: not tappable, no check. */
export function EndMap({
	goal,
	places,
	style,
}: {
	/** The opened end goal asset. */
	goal: ImageSource | number | null;
	places: Record<
		MapPlaceNode,
		{ name: string; picture: ImageSource | number | null }
	>;
	style?: ViewStyle;
}) {
	const [width, setWidth] = useState(0);
	const e = width / END_DRAWN;
	return (
		<View
			onLayout={(event: LayoutChangeEvent) =>
				setWidth(event.nativeEvent.layout.width)
			}
			style={[styles.end, style]}
		>
			{width > 0 ? (
				<>
					<Image
						accessibilityIgnoresInvertColors
						contentFit="fill"
						source={MEADOW}
						style={{
							height: width * MEADOW_RATIO,
							left: 0,
							position: "absolute",
							top: END_MEADOW_TOP * e,
							width,
						}}
					/>
					<View
						pointerEvents="none"
						style={[StyleSheet.absoluteFill, { backgroundColor: END_DIM }]}
					/>
					{END_STONES.map((stone) => (
						<SteppingStone
							key={`${stone.x}-${stone.y}`}
							rotate={stone.rotate}
							style={{
								left: stone.x * e,
								position: "absolute",
								top: stone.y * e,
							}}
							variant={stone.variant}
							width={stone.width * e}
						/>
					))}
					<Goal
						height={END_GOAL.width * END_GOAL.ratio * e}
						image={goal}
						kind="goalOpen"
						shadow={moonShadow}
						x={END_GOAL.x * e}
						y={END_GOAL.foot * e}
					/>
					{PLACE_NODES.map((node) => (
						<Medallion
							accessibilityLabel={places[node].name}
							key={node}
							picture={places[node].picture}
							plain
							size={END_MEDAL * e}
							style={{
								left: (END_NODES[node].x - END_MEDAL / 2) * e,
								position: "absolute",
								top: (END_NODES[node].y - END_MEDAL / 2) * e,
							}}
						/>
					))}
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	end: {
		alignSelf: "stretch",
		aspectRatio: 1,
		borderRadius: END_RADIUS,
		overflow: "hidden",
	},
	// The screen body has side margins; the map spans the whole screen width.
	map: { flex: 1, marginHorizontal: -layout.sideMargin },
});
