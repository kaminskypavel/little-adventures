import { Image } from "expo-image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import { EaseView } from "react-native-ease";
import Svg, { Path } from "react-native-svg";
import { BackButton, useBackAction } from "./back-button";
import {
	BAR_TOP,
	idOf,
	ROAD_PATHS,
	SAFE_X,
	SPOTS,
	STAGE,
	STAR,
	TOP_LANE,
	walkPoints,
} from "./fork-spots";
import { Medallion } from "./medallion";
import { useCalm } from "./motion-provider";
import { NamePill } from "./name-pill";
import { Plate } from "./plate";
import { SealedDisc } from "./sealed-disc";
import {
	Goal,
	goalShadow,
	type MapGoodnight,
	type MapNode,
	type MapPlace,
	type MapPlaceNode,
} from "./story-map";
import { colors, mapSeal, motion } from "./tokens";
import { Walker } from "./walker";

// ---------------------------------------------------------------------------------------------
// The sideways map: the road forks after the intro into two lanes of places and merges at the
// goodnight. It is drawn on an 852 x 393 stage (an iPhone turned sideways) and the stage is scaled
// to fit the screen, so every number below is a point of that drawing.
// ---------------------------------------------------------------------------------------------

const MEDALLION = 64;
const MEDALLION_HERE = 72;
const GOAL_SIZE = 96;
const GOAL_FOOT = 254;
/** The gap between a medallion and its plate. */
const PLATE_GAP = 8;
const PLATE_BOX = 220;
/** A place plate: at most two lines, 168 wide, a little rounder than the kit's lesson pill. */
const PLATE_LOOK = { borderRadius: 13, maxWidth: 168, paddingHorizontal: 11 };
const MEADOW = require("../assets/map/meadow.jpg");
const MEADOW_TOP = -137;
const MEADOW_RATIO = 1688 / 780;
const SCRIM = "rgba(10,22,44,0.36)";
const SAFE_BOTTOM = 20;
/** The title pill sits beside the back button (64 wide), 8 pt off it, centred on it. */
const BACK_SIZE = 64;
const TITLE_GAP = 8;
const TITLE_HEIGHT = 36;
/** Roads that lead to a sealed place are drawn this faint. */
const SEALED_ROAD = 0.28;

const ROAD = {
	dots: "#E8A81C",
	glow: "rgba(255,200,60,0.35)",
	ready: "rgba(244,236,216,0.95)",
	under: "rgba(10,22,44,0.4)",
	unlit: "rgba(244,236,216,0.4)",
} as const;

function Roads({
	dots,
	faint,
	lit,
}: {
	dots: ReadonlySet<string>;
	/** Roads that lead to a sealed place. */
	faint: ReadonlySet<string>;
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
					opacity={faint.has(id) && !lit.has(id) ? SEALED_ROAD : 1}
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
						opacity={faint.has(id) && !lit.has(id) ? SEALED_ROAD : 1}
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

/**
 * A plate centred on `x`. It hangs from `top` or stands on `bottom` (a distance from the stage's
 * bottom edge), so a plate of one line or two keeps its gap to the medallion. A `rise` plate
 * fades up into place once, after its place has opened.
 */
function NamePlate({
	icon,
	label,
	lesson = false,
	rise = false,
	tone,
	x,
	...edge
}: {
	icon?: "lock";
	label: string;
	/** Two lines of small type: a question, an answer or a name on the map. */
	lesson?: boolean;
	rise?: boolean;
	tone: "dim" | "sand" | "sun";
	x: number;
} & ({ bottom: number; top?: never } | { bottom?: never; top: number })) {
	const box = [styles.plateBox, { left: x - PLATE_BOX / 2, ...edge }];
	const plate = (
		<Plate
			icon={icon}
			label={label}
			style={lesson ? [styles.plate, PLATE_LOOK] : styles.plate}
			tone={tone}
			variant={lesson ? "lesson" : "place"}
		/>
	);
	if (rise) {
		return (
			<EaseView
				animate={{ opacity: 1, translateY: 0 }}
				initialAnimate={{ opacity: 0, translateY: mapSeal.riseDrop }}
				pointerEvents="none"
				style={box}
				transition={{
					delay: mapSeal.riseDelay,
					duration: motion.enter,
					easing: "easeOut",
					type: "timing",
				}}
			>
				{plate}
			</EaseView>
		);
	}
	return (
		<View pointerEvents="none" style={box}>
			{plate}
		</View>
	);
}

/**
 * One place on the stage. Sealed, it is its medallion with the picture blurred out. Open, it is its
 * medallion; a place that just opened for the first time (`reveal`) clears and pops in, unless calm
 * motion is asked for.
 */
function Spot({
	node,
	place,
	walking,
}: {
	node: MapPlaceNode;
	place: MapPlace;
	walking: boolean;
}) {
	const calm = useCalm();
	const { x, y } = SPOTS[node];
	const seal: ViewStyle = {
		left: x - MEDALLION / 2,
		position: "absolute",
		top: y - MEDALLION / 2,
	};
	if (place.state === "default") {
		return <SealedDisc picture={place.picture} size={MEDALLION} style={seal} />;
	}
	const size = place.state === "here" ? MEDALLION_HERE : MEDALLION;
	const box: ViewStyle = {
		height: size,
		left: x - size / 2,
		position: "absolute",
		top: y - size / 2,
		width: size,
	};
	const medallion = (
		<Medallion
			accessibilityLabel={place.name}
			onPress={walking ? undefined : place.onPress}
			picture={place.picture}
			size={size}
			state={place.state}
		/>
	);
	if (place.reveal && !calm) {
		return (
			<>
				<Unseal picture={place.picture} style={seal} />
				<Pop style={box}>{medallion}</Pop>
			</>
		);
	}
	return <View style={box}>{medallion}</View>;
}

/** The blurred medallion fades as the clear one pops in over it. */
function Unseal({
	picture,
	style,
}: {
	picture: MapPlace["picture"];
	style: ViewStyle;
}) {
	return (
		<EaseView
			animate={{ opacity: 0, scale: mapSeal.sealedScale }}
			initialAnimate={{ opacity: 1, scale: 1 }}
			pointerEvents="none"
			style={style}
			transition={{
				duration: mapSeal.fade,
				easing: "easeOut",
				type: "timing",
			}}
		>
			<SealedDisc picture={picture} size={MEDALLION} />
		</EaseView>
	);
}

/** The medallion pops in: small to a little too big (after a beat), then settles at full size. */
function Pop({ children, style }: { children: ReactNode; style: ViewStyle }) {
	const [peaked, setPeaked] = useState(false);
	return (
		<EaseView
			animate={{ opacity: 1, scale: peaked ? 1 : mapSeal.popPeak }}
			initialAnimate={{ opacity: 0, scale: mapSeal.popFrom }}
			onTransitionEnd={() => setPeaked(true)}
			style={style}
			transition={
				peaked
					? {
							duration: mapSeal.popSettle,
							easing: "easeInOut",
							type: "timing",
						}
					: {
							delay: mapSeal.popDelay,
							duration: mapSeal.popPeakAt,
							easing: "easeOut",
							type: "timing",
						}
			}
		>
			{children}
		</EaseView>
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
 * back button, a title pill and the main button at the bottom right. (The app lays its menu over
 * the top right corner; see `topRightCorner`.) `lit` are the roads walked, `dots` the roads the
 * child can take next (road ids are `from-to`). A `route` of two stops or more is walked once by
 * the star along the roads, then `onWalked` runs; with `walkTo` set and no route to walk,
 * `onWalked` runs at once.
 */
export function ForkMap({
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
	// The walk is worked out once per route: a new array each render would restart the star.
	const key = route.join(",");
	const walk = useMemo(() => walkPoints(key.split(",") as MapNode[]), [key]);
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

	const nodes = Object.keys(places) as MapPlaceNode[];
	const calm = useCalm();
	// A road is faint when a place at either end is sealed.
	const faint = new Set(
		Object.keys(ROAD_PATHS).filter((id) =>
			id
				.split("-")
				.some((end) => places[end as MapPlaceNode]?.state === "default")
		)
	);

	const scale = Math.min(box.width / STAGE.width, box.height / STAGE.height);
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
					<Roads dots={dots} faint={faint} lit={shining} />
					<Goal
						height={GOAL_SIZE}
						image={goodnight.image}
						kind={goodnight.locked ? "goalClosed" : "goalOpen"}
						shadow={goalShadow}
						x={SPOTS.outro.x}
						y={GOAL_FOOT}
					/>
					{nodes.map((node) => (
						<Spot
							key={node}
							node={node}
							place={places[node]}
							walking={walking}
						/>
					))}
					{nodes
						.filter((node) => places[node].label)
						.map((node) => {
							const place = places[node];
							const { x, y } = SPOTS[node];
							const half =
								(place.state === "here" ? MEDALLION_HERE : MEDALLION) / 2;
							const tone =
								place.lesson?.kind === "answer" || place.state === "here"
									? "sun"
									: "sand";
							// The top lane's plates stand on the medallion, the others hang from it.
							const edge =
								y === TOP_LANE
									? { bottom: STAGE.height - (y - half - PLATE_GAP) }
									: { top: y + half + PLATE_GAP };
							return (
								<NamePlate
									key={node}
									label={place.lesson?.text ?? place.name}
									lesson
									rise={Boolean(place.reveal) && !calm}
									tone={tone}
									x={x}
									{...edge}
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
						onLand={(index) => {
							// Walker counts hops; the roads light up per place of the route.
							const place = walk.stops.indexOf(index);
							if (place > 0) {
								setLanded((n) => Math.max(n, place));
							}
						}}
						route={walk.points}
						size={STAR}
					/>
					{onBack ? (
						<View style={[styles.corner, { left: SAFE_X - 4, top: BAR_TOP }]}>
							<BackButton onPress={onBack} />
						</View>
					) : null}
					{title ? (
						<View
							pointerEvents="none"
							style={[
								styles.corner,
								{
									left: SAFE_X - 4 + BACK_SIZE + TITLE_GAP,
									top: BAR_TOP + (BACK_SIZE - TITLE_HEIGHT) / 2,
								},
							]}
						>
							<NamePill compact text={title} />
						</View>
					) : null}
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
});
