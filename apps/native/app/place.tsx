import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { Icon } from "@little-adventures/native-ui/icons";
import { NamePill } from "@little-adventures/native-ui/name-pill";
import { NarrationBar } from "@little-adventures/native-ui/narration-bar";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { colors, layout, radii } from "@little-adventures/native-ui/tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { StyleSheet, View } from "react-native";
import {
	cancelAnimation,
	Easing,
	useAnimatedReaction,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { getProfile } from "@/src/data/adventure-client";
import type { Adventure, NodeId } from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";

// Mock narration length: how long the line takes to read before the screen moves on.
const PLACE_MS = 8000;
const GOODNIGHT_MS = 6000;

// Round 7 video scrim: dark navy, stronger at the bottom. Not in tokens yet.
const SCRIM_TOP = "rgba(10,22,44,0.6)";
const SCRIM_CLEAR = "rgba(10,22,44,0)";
const SCRIM_BOTTOM = "rgba(10,22,44,0.8)";
const SCRIM_COLORS = [
	SCRIM_TOP,
	SCRIM_CLEAR,
	SCRIM_CLEAR,
	SCRIM_BOTTOM,
] as const;
const SCRIM_STOPS = [0, 0.22, 0.55, 1] as const;

// Round 7: the pause icon is 30 px in a 64 px button, so 42 pt in the 88 pt circle.
const PAUSE_ICON = 42;
// The goodnight picture is a tall cut-out; show it at this share of the frame width.
const GOAL_WIDTH = "60%";
const GOAL_RATIO = 365 / 500;

function Scrim() {
	return (
		<LinearGradient
			colors={SCRIM_COLORS}
			locations={SCRIM_STOPS}
			pointerEvents="none"
			style={StyleSheet.absoluteFill}
		/>
	);
}

/**
 * The player: a full-frame picture, a back-to-map button with the place name, the
 * words being read, and one big pause button. The mock "narration" is a timer; the
 * current word advances evenly and pause holds it.
 */
function Player({
	durationMs,
	frame,
	name,
	onBack,
	onEnd,
	words,
}: {
	durationMs: number;
	frame: ReactNode;
	name: string;
	onBack: () => void;
	onEnd: () => void;
	words: string[];
}) {
	const insets = useSafeAreaInsets();
	const progress = useSharedValue(0);
	const [current, setCurrent] = useState(0);
	const [playing, setPlaying] = useState(true);

	const endRef = useRef(onEnd);
	endRef.current = onEnd;
	const fireEnd = useCallback(() => endRef.current(), []);

	const total = words.length;
	useAnimatedReaction(
		() => Math.min(total - 1, Math.floor(progress.get() * total)),
		(index, previous) => {
			if (index !== previous) {
				scheduleOnRN(setCurrent, index);
			}
		}
	);

	const run = useCallback(() => {
		progress.set(
			withTiming(
				1,
				{
					duration: durationMs * (1 - progress.get()),
					easing: Easing.linear,
				},
				(finished) => {
					if (finished) {
						scheduleOnRN(fireEnd);
					}
				}
			)
		);
	}, [durationMs, fireEnd, progress]);

	useEffect(() => {
		run();
		return () => cancelAnimation(progress);
	}, [progress, run]);

	const toggle = () => {
		if (playing) {
			cancelAnimation(progress);
		} else {
			run();
		}
		setPlaying(!playing);
	};

	return (
		<View style={styles.root}>
			{frame}
			<Scrim />
			<View
				pointerEvents="box-none"
				style={[styles.top, { top: insets.top + layout.topBarOffset }]}
			>
				<IconButton
					accessibilityLabel="Back to the map"
					icon="map"
					onPress={onBack}
				/>
				<NamePill text={name} />
			</View>
			<NarrationBar
				current={current}
				progress={progress}
				style={[
					styles.narration,
					{
						bottom:
							insets.bottom +
							layout.dockBottom +
							layout.primaryHeight +
							layout.gap,
					},
				]}
				words={words}
			/>
			<View
				pointerEvents="box-none"
				style={[styles.control, { bottom: insets.bottom + layout.dockBottom }]}
			>
				<ClayPressable
					accessibilityLabel={playing ? "Pause" : "Play"}
					onPress={toggle}
					radius={radii.full}
					style={styles.pause}
					tone="sun"
				>
					<Icon
						color={colors.inkNavy}
						name={playing ? "pause" : "play"}
						size={PAUSE_ICON}
					/>
				</ClayPressable>
			</View>
		</View>
	);
}

function PlaceFrame({ picture }: { picture: number | null }) {
	if (picture === null) {
		return <Placeholder icon="image" style={StyleSheet.absoluteFill} />;
	}
	return (
		<Image
			contentFit="cover"
			source={picture}
			style={StyleSheet.absoluteFill}
		/>
	);
}

/** There is no goodnight picture, so the open end goal stands on its backdrop. */
function GoodnightFrame({ adventure }: { adventure: Adventure }) {
	const insets = useSafeAreaInsets();
	return (
		<View
			style={[
				styles.goal,
				{
					backgroundColor: colors.goalBackdrop,
					paddingTop:
						insets.top + layout.topBarOffset + layout.topBarHeight + layout.gap,
				},
			]}
		>
			<Image
				contentFit="contain"
				source={adventure.endGoal.open}
				style={{ aspectRatio: GOAL_RATIO, width: GOAL_WIDTH }}
			/>
		</View>
	);
}

/** 12 Place video and 15 Goodnight video. */
export default function Place() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string; node?: string }>();
	const id = params.id ?? "box";
	const node = (params.node ?? "p1") as NodeId;
	const { adventure, visit } = useAdventure(id);
	const [childName, setChildName] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		getProfile().then((profile) => live && setChildName(profile.childName));
		return () => {
			live = false;
		};
	}, []);

	const goodnight = node === "outro";

	const onEnd = useCallback(async () => {
		await visit(node);
		router.replace(
			goodnight ? `/end?id=${id}` : `/choice?id=${id}&from=${node}`
		);
	}, [goodnight, id, node, router, visit]);

	const onBack = useCallback(
		() => router.replace(`/map?id=${id}`),
		[id, router]
	);

	if (!adventure || childName === null) {
		return null;
	}
	const place = adventure.places[node];

	return (
		<Player
			durationMs={goodnight ? GOODNIGHT_MS : PLACE_MS}
			frame={
				goodnight ? (
					<GoodnightFrame adventure={adventure} />
				) : (
					<PlaceFrame picture={place.picture} />
				)
			}
			name={place.name}
			onBack={onBack}
			onEnd={onEnd}
			words={
				goodnight
					? `And the moon said goodnight, ${childName}.`.split(" ")
					: place.narration
			}
		/>
	);
}

const styles = StyleSheet.create({
	control: {
		alignItems: "center",
		left: 0,
		position: "absolute",
		right: 0,
	},
	goal: {
		alignItems: "center",
		bottom: 0,
		justifyContent: "flex-start",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	narration: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
	pause: {
		alignItems: "center",
		height: layout.primaryHeight,
		justifyContent: "center",
		width: layout.primaryHeight,
	},
	root: { flex: 1 },
	top: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
});
