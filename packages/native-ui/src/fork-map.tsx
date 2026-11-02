import { Image } from "expo-image";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { BackButton, useBackAction } from "./back-button";
import { IconButton } from "./icon-button";
import type { IconName } from "./icons";
import { Medallion } from "./medallion";
import { NamePill } from "./name-pill";
import { Plate } from "./plate";
import {
	Goal,
	goalShadow,
	type MapGoodnight,
	type MapNode,
	type MapPlace,
	type MapPlaceNode,
} from "./story-map";
import { colors, flat } from "./tokens";
import { Walker, type WalkerPoint } from "./walker";

// ---------------------------------------------------------------------------------------------
// The sideways map: the road forks after the intro into two lanes of places and merges at the
// goodnight. It is drawn on an 852 x 393 stage (an iPhone turned sideways) and the stage is scaled
// to fit the screen, so every number below is a point of that drawing.
// ---------------------------------------------------------------------------------------------

const STAGE = { height: 393, width: 852 };
const MEDALLION = 64;
const MEDALLION_HERE = 72;
const GOAL_SIZE = 96;
const GOAL_FOOT = 245;
const STAR = 46;
/** The gap between a medallion and its name plate. */
const PLATE_GAP = 9;
const PLATE_BOX = 220;
const DIMMED = 0.6;
const MEADOW = require("../assets/map/meadow.jpg");
const MEADOW_TOP = -137;
const MEADOW_RATIO = 1688 / 780;
const SCRIM = "rgba(10,22,44,0.36)";
/** The tall lanes: the top lane carries its names above, the bottom lane below. */
const TOP_LANE = 150;
const BOTTOM_LANE = 246;
const MID_LANE = 198;
const SAFE_X = 59;
const SAFE_BOTTOM = 21;
const BAR_TOP = 14;
const TITLE_TOP = 24;

const SPOTS: Record<MapNode, { x: number; y: number }> = {
	intro: { x: 119, y: MID_LANE },
	outro: { x: 716, y: MID_LANE },
	p1: { x: 318, y: TOP_LANE },
	p1a: { x: 517, y: TOP_LANE },
	p2: { x: 318, y: BOTTOM_LANE },
	p2a: { x: 517, y: BOTTOM_LANE },
};

/** Road geometry by road id (`from-to`). The app owns which roads exist and which are lit. */
const ROAD_PATHS: Record<string, string> = {
	"intro-p1": "M155,198 C215,198 222,150 282,150",
	"intro-p2": "M155,198 C215,198 222,246 282,246",
	"p1-p1a": "M354,150 L481,150",
	"p1-p2": "M318,186 L318,210",
	"p1a-outro": "M553,150 C610,150 604,198 664,198",
	"p1a-p2a": "M517,186 L517,210",
	"p2-p2a": "M354,246 L481,246",
	"p2a-outro": "M553,246 C610,246 604,198 664,198",
};

const ROAD = {
	dots: "#E8A81C",
	glow: "rgba(255,200,60,0.35)",
	ready: "rgba(244,236,216,0.95)",
	under: "rgba(10,22,44,0.4)",
	unlit: "rgba(244,236,216,0.4)",
} as const;

const idOf = (a: MapNode, b: MapNode) => {
	const forward = `${a}-${b}`;
	return forward in ROAD_PATHS ? forward : `${b}-${a}`;
};

/** The star stands above the intro and the goodnight, and beside a place on a lane. */
function standAt(node: MapNode): WalkerPoint {
	const { x, y } = SPOTS[node];
	if (node === "intro" || node === "outro") {
		return { x: x - STAR / 2, y: y - 91 };
	}
	return { x: x - 93, y: y - 20 };
}

function Roads({
	dots,
	lit,
}: {
	dots: ReadonlySet<string>;
	lit: ReadonlySet<string>;
}) {
	const roads = Object.entries(ROAD_PATHS);
	const stroke = { fill: "none", strokeLinecap: "round" } as const;
	return (
		<Svg
			height={STAGE.height}
			pointerEvents="none"
			style={styles.fill}
			width={STAGE.width}
		>
			{roads.map(([id, d]) => (
				<Path
					d={d}
					key={`under-${id}`}
					stroke={ROAD.under}
					strokeWidth={18}
					{...stroke}
				/>
			))}
			{roads.map(([id, d]) => {
				const walked = lit.has(id);
				const ahead = dots.has(id);
				let color: string = ROAD.unlit;
				if (walked) {
					color = colors.sun;
				} else if (ahead) {
					color = ROAD.ready;
				}
				return (
					<Path
						d={d}
						key={`road-${id}`}
						stroke={color}
						strokeWidth={12}
						{...stroke}
					/>
				);
			})}
			{roads
				.filter(([id]) => lit.has(id))
				.map(([id, d]) => (
					<Path
						d={d}
						key={`glow-${id}`}
						stroke={ROAD.glow}
						strokeWidth={22}
						{...stroke}
					/>
				))}
			{roads
				.filter(([id]) => dots.has(id) && !lit.has(id))
				.map(([id, d]) => (
					<Path
						d={d}
						key={`dots-${id}`}
						stroke={ROAD.dots}
						strokeDasharray="0.1 12"
						strokeWidth={4}
						{...stroke}
					/>
				))}
		</Svg>
	);
}

/** A name plate centred on `x`, its top at `top`. */
function NamePlate({
	icon,
	label,
	tone,
	top,
	x,
}: {
	icon?: "lock";
	label: string;
	tone: "dim" | "sand" | "sun";
	top: number;
	x: number;
}) {
	return (
		<View
			pointerEvents="none"
			style={[styles.plateBox, { left: x - PLATE_BOX / 2, top }]}
		>
			<Plate icon={icon} label={label} style={styles.plate} tone={tone} />
		</View>
	);
}

function Backdrop({ height, width }: { height: number; width: number }) {
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Image
				accessibilityIgnoresInvertColors
				contentFit="fill"
				source={MEADOW}
				style={{
					height: width * MEADOW_RATIO,
					left: 0,
					position: "absolute",
					top: MEADOW_TOP * (width / STAGE.width),
					width,
				}}
			/>
			<View
				style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM, height }]}
			/>
		</View>
	);
}

/**
 * The whole sideways map screen: meadow, roads, the five places, the goodnight, the star, the
 * back button, a title pill, an optional button at the top right and the main button at the
 * bottom right. `lit` are the roads walked, `dots` the roads the child can take next (road ids
 * are `from-to`). A `route` of two stops or more is walked once by the star, then `onWalked` runs;
 * with `walkTo` set and no route to walk, `onWalked` runs at once.
 */
export function ForkMap({
	action,
	button,
	dots,
	goodnight,
	here,
	lit,
	onWalked,
	places,
	route,
	title,
	walkTo,
}: {
	action?: { accessibilityLabel: string; icon: IconName; onPress: () => void };
	/** The main button. It is placed at the bottom right. */
	button: ReactNode;
	dots: ReadonlySet<string>;
	goodnight: MapGoodnight;
	/** Where the star stands when it is not walking. */
	here: MapNode;
	lit: ReadonlySet<string>;
	onWalked?: () => void;
	places: Record<MapPlaceNode, MapPlace>;
	/** The stops the star walks, the first being `here`. */
	route: readonly MapNode[];
	title: string;
	walkTo?: MapNode;
}) {
	const onBack = useBackAction();
	const [box, setBox] = useState({ height: 0, width: 0 });
	const [landed, setLanded] = useState(0);
	const walking = route.length > 1;
	const walked = useRef(onWalked);
	useEffect(() => {
		walked.current = onWalked;
	}, [onWalked]);
	// Already standing at the place: nothing to walk, so it opens at once.
	useEffect(() => {
		if (walkTo && !walking) {
			walked.current?.();
		}
	}, [walkTo, walking]);

	// Roads the star has passed light up as it lands on each stop.
	const shining = new Set(lit);
	for (const [index, stop] of route.slice(1, landed + 1).entries()) {
		shining.add(idOf(route[index] as MapNode, stop));
	}

	const scale = Math.min(box.width / STAGE.width, box.height / STAGE.height);
	const stops = route.map(standAt);
	const starts = route.at(-1) === "outro" || here === "outro";
	const goodnightPlate = (() => {
		if (goodnight.locked) {
			return "dim";
		}
		return starts && !walking ? "sun" : "sand";
	})();

	return (
		<View
			onLayout={(event: LayoutChangeEvent) => {
				const { height, width } = event.nativeEvent.layout;
				setBox((prev) =>
					prev.height === height && prev.width === width
						? prev
						: { height, width }
				);
			}}
			style={styles.root}
		>
			<Backdrop height={box.height} width={box.width} />
			{box.width > 0 ? (
				<View
					pointerEvents="box-none"
					style={[
						styles.stage,
						{
							left: (box.width - STAGE.width) / 2,
							top: (box.height - STAGE.height) / 2,
							transform: [{ scale }],
						},
					]}
				>
					<Roads dots={dots} lit={shining} />
					<Goal
						height={GOAL_SIZE}
						image={goodnight.image}
						kind={goodnight.locked ? "goalClosed" : "goalOpen"}
						shadow={goalShadow}
						x={SPOTS.outro.x}
						y={GOAL_FOOT}
					/>
					{(Object.keys(places) as MapPlaceNode[]).map((node) => {
						const place = places[node];
						const size = place.state === "here" ? MEDALLION_HERE : MEDALLION;
						const { x, y } = SPOTS[node];
						return (
							<Medallion
								accessibilityLabel={place.name}
								key={node}
								onPress={walking ? undefined : place.onPress}
								picture={place.picture}
								size={size}
								state={place.state}
								style={{
									left: x - size / 2,
									opacity: place.state === "default" ? DIMMED : 1,
									position: "absolute",
									top: y - size / 2,
								}}
							/>
						);
					})}
					{(Object.keys(places) as MapPlaceNode[]).map((node) => {
						const place = places[node];
						const { x, y } = SPOTS[node];
						const above = y === TOP_LANE;
						const half =
							(place.state === "here" ? MEDALLION_HERE : MEDALLION) / 2;
						const top = above
							? y - half - PLATE_GAP - flat.plate.place.height
							: y + half + PLATE_GAP;
						let tone: "dim" | "sand" | "sun" = "sand";
						if (place.state === "here") {
							tone = "sun";
						} else if (place.state === "default") {
							tone = "dim";
						}
						return (
							<NamePlate
								key={node}
								label={place.name}
								tone={tone}
								top={top}
								x={x}
							/>
						);
					})}
					<NamePlate
						icon={goodnight.locked ? "lock" : undefined}
						label={goodnight.name}
						tone={goodnightPlate}
						top={GOAL_FOOT + 4}
						x={SPOTS.outro.x}
					/>
					<Walker
						onDone={onWalked}
						onLand={(index) => setLanded((n) => Math.max(n, index))}
						route={walking ? stops : [standAt(here)]}
						size={STAR}
					/>
					{onBack ? (
						<View style={[styles.corner, { left: SAFE_X - 4, top: BAR_TOP }]}>
							<BackButton onPress={onBack} />
						</View>
					) : null}
					{action ? (
						<View style={[styles.corner, { right: SAFE_X - 4, top: BAR_TOP }]}>
							<IconButton
								accessibilityLabel={action.accessibilityLabel}
								icon={action.icon}
								onPress={action.onPress}
							/>
						</View>
					) : null}
					<View
						pointerEvents="none"
						style={[styles.titleRow, { top: TITLE_TOP }]}
					>
						<NamePill style={styles.plate} text={title} />
					</View>
					<View style={[styles.corner, { bottom: SAFE_BOTTOM, right: SAFE_X }]}>
						{button}
					</View>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	corner: { position: "absolute" },
	fill: { left: 0, position: "absolute", top: 0 },
	plate: { alignSelf: "center" },
	plateBox: { alignItems: "center", position: "absolute", width: PLATE_BOX },
	root: { flex: 1 },
	stage: { height: STAGE.height, position: "absolute", width: STAGE.width },
	titleRow: { alignItems: "center", left: 0, position: "absolute", right: 0 },
});
