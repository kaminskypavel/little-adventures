import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { FallbackImage } from "@little-adventures/native-ui/fallback-image";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { Icon } from "@little-adventures/native-ui/icons";
import { NamePill } from "@little-adventures/native-ui/name-pill";
import { NarrationBar } from "@little-adventures/native-ui/narration-bar";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { colors, layout, radii } from "@little-adventures/native-ui/tokens";
import { useEventListener } from "expo";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { StyleSheet, View } from "react-native";
import {
	cancelAnimation,
	Easing,
	type SharedValue,
	useAnimatedReaction,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { endSource, wordIndexAt } from "@/src/data/playback";
import { useChildName } from "@/src/data/profile-queries";
import { readWindow } from "@/src/data/read-window";
import type {
	Adventure,
	NarrationAudio,
	NodeId,
	Picture,
} from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";

// Bundled narration length: how long the line takes to read before the screen moves on.
const PLACE_MS = 8000;
const GOODNIGHT_MS = 6000;
// How often the narration reports its time, in ms: often enough for the word chip to keep up.
const NARRATION_TICK_MS = 100;
// How often the clip reports its time, in seconds. It only shows that a frame is on screen.
const CLIP_TICK_SEC = 0.25;

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
// The read-along card shows one sentence (see readWindow) and stops here, so the place name and
// the picture above it stay visible.
const NARRATION_MAX_HEIGHT = 270;

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
 * What the player shows, whatever keeps its time: a full-frame picture or clip, a back-to-map
 * button with the place name, the words being read, and one big pause button.
 */
function PlayerChrome({
	current,
	frame,
	name,
	onBack,
	onToggle,
	playing,
	progress,
	words,
}: {
	current: number;
	frame: ReactNode;
	name: string;
	onBack: () => void;
	onToggle: () => void;
	playing: boolean;
	progress: number | SharedValue<number>;
	words: string[];
}) {
	const insets = useSafeAreaInsets();
	const { end, start } = useMemo(
		() => readWindow(words, current),
		[words, current]
	);
	const shown = useMemo(() => words.slice(start, end), [words, start, end]);
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
				current={current - start}
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
				words={shown}
			/>
			<View
				pointerEvents="box-none"
				style={[styles.control, { bottom: insets.bottom + layout.dockBottom }]}
			>
				<ClayPressable
					accessibilityLabel={playing ? "Pause" : "Play"}
					onPress={onToggle}
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

/**
 * The player for the bundled adventure, which has no sound: a timer. The current word advances
 * evenly over `durationMs` and pause holds it.
 */
function TimerPlayer({
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
	const progress = useSharedValue(0);
	const [current, setCurrent] = useState(0);
	const [playing, setPlaying] = useState(true);

	const endRef = useRef(onEnd);
	useLayoutEffect(() => {
		endRef.current = onEnd;
	}, [onEnd]);
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
		<PlayerChrome
			current={current}
			frame={frame}
			name={name}
			onBack={onBack}
			onToggle={toggle}
			playing={playing}
			progress={progress}
			words={words}
		/>
	);
}

const setPaused = (
	player: { pause: () => void; play: () => void },
	paused: boolean
) => (paused ? player.pause() : player.play());

/**
 * The player for an engine node: its clip (muted) and its narration start together. The picture
 * stays up until the clip shows a frame. A node with a clip moves on when the clip ends; one
 * without shows its picture for the narration's length. The words follow the narration.
 */
function MediaPlayer({
	audio,
	clip,
	cover,
	name,
	onBack,
	onEnd,
	onMediaError,
	timerMs,
	words,
}: {
	audio: NarrationAudio | null;
	clip: number | string | null;
	/** The picture, shown when there is no clip and until the clip has a frame. */
	cover: ReactNode;
	name: string;
	onBack: () => void;
	onEnd: () => void;
	onMediaError: () => void;
	/** How long the node stays when neither its clip nor its narration can end it. */
	timerMs: number;
	words: string[];
}) {
	const audioPlayer = useAudioPlayer(audio?.url ?? null, {
		updateInterval: NARRATION_TICK_MS,
	});
	const heard = useAudioPlayerStatus(audioPlayer);
	const videoPlayer = useVideoPlayer(clip, (created) => {
		created.loop = false;
		created.muted = true;
		created.timeUpdateEventInterval = CLIP_TICK_SEC;
	});
	const [clipStatus, setClipStatus] = useState(videoPlayer.status);
	const [framed, setFramed] = useState(false);
	const [playing, setPlaying] = useState(true);
	const started = useRef<boolean>(false);
	const ended = useRef<boolean>(false);

	const clipFailed = clipStatus === "error";
	const narrationFailed = Boolean(heard.error);
	const hasClip = clip !== null && !clipFailed;
	const hasNarration = audio !== null && !narrationFailed;
	const source = endSource({ hasClip, hasNarration });
	// The narration may finish before a clip that then fails: remember it did.
	const [narrationEnded, setNarrationEnded] = useState(false);

	const endRef = useRef(onEnd);
	useLayoutEffect(() => {
		endRef.current = onEnd;
	}, [onEnd]);
	const fireEnd = useCallback(() => {
		if (!ended.current) {
			ended.current = true;
			endRef.current();
		}
	}, []);

	useEventListener(videoPlayer, "statusChange", ({ status }) =>
		setClipStatus(status)
	);
	useEventListener(videoPlayer, "timeUpdate", ({ currentTime }) => {
		if (currentTime > 0) {
			setFramed(true);
		}
	});
	useEventListener(videoPlayer, "playToEnd", () => {
		if (hasClip) {
			fireEnd();
		}
	});
	useEffect(() => {
		if (heard.didJustFinish) {
			setNarrationEnded(true);
		}
	}, [heard.didJustFinish]);
	useEffect(() => {
		if (source === "narration" && narrationEnded) {
			fireEnd();
		}
	}, [fireEnd, narrationEnded, source]);
	useEffect(() => {
		if (source !== "timer" || !playing) {
			return;
		}
		const timer = setTimeout(fireEnd, timerMs);
		return () => clearTimeout(timer);
	}, [fireEnd, playing, source, timerMs]);
	// A url that fails has most likely expired: ask for fresh ones (the first failure only).
	useEffect(() => {
		if (clipFailed || narrationFailed) {
			onMediaError();
		}
	}, [clipFailed, narrationFailed, onMediaError]);

	const ready =
		(!hasNarration || heard.isLoaded) &&
		(!hasClip || clipStatus === "readyToPlay");
	useEffect(() => {
		if (started.current || !ready || !playing) {
			return;
		}
		started.current = true;
		if (hasNarration) {
			audioPlayer.play();
		}
		if (hasClip) {
			videoPlayer.play();
		}
	}, [audioPlayer, hasClip, hasNarration, playing, ready, videoPlayer]);

	const toggle = () => {
		if (started.current) {
			if (hasNarration) {
				setPaused(audioPlayer, playing);
			}
			if (hasClip) {
				setPaused(videoPlayer, playing);
			}
		}
		setPlaying(!playing);
	};

	const showCover = !(hasClip && framed);
	const spoken = hasNarration ? heard.currentTime : 0;
	const length = hasNarration ? heard.duration : 0;
	const frame = (
		<View style={StyleSheet.absoluteFill}>
			{hasClip ? (
				<VideoView
					allowsPictureInPicture={false}
					contentFit="cover"
					nativeControls={false}
					onFirstFrameRender={() => setFramed(true)}
					player={videoPlayer}
					playsInline
					pointerEvents="none"
					style={StyleSheet.absoluteFill}
				/>
			) : null}
			{showCover ? cover : null}
		</View>
	);

	return (
		<PlayerChrome
			current={
				hasNarration && audio ? wordIndexAt(audio.words, spoken, length) : 0
			}
			frame={frame}
			name={name}
			onBack={onBack}
			onToggle={toggle}
			playing={playing}
			progress={length > 0 ? spoken / length : 0}
			words={words}
		/>
	);
}

function PlaceFrame({
	onError,
	picture,
}: {
	onError?: () => void;
	picture: Picture | null;
}) {
	return (
		<FallbackImage
			contentFit="cover"
			kind="place"
			onError={onError}
			placeholder={<Placeholder icon="image" style={StyleSheet.absoluteFill} />}
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
			<FallbackImage
				contentFit="contain"
				kind="goalOpen"
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
	const { adventure, onMediaError, visit } = useAdventure(id);
	const childName = useChildName();

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

	if (!adventure || childName === undefined) {
		return null;
	}
	const place = adventure.places[node];
	const audio = place.audio ?? null;
	const fixedLine = goodnight && audio === null;
	const words = fixedLine
		? `And the moon said goodnight, ${childName}.`.split(" ")
		: place.narration;
	const cover =
		goodnight && place.picture === null ? (
			<GoodnightFrame adventure={adventure} />
		) : (
			<PlaceFrame onError={onMediaError} picture={place.picture} />
		);

	if (audio === null && place.video === null) {
		return (
			<TimerPlayer
				durationMs={goodnight ? GOODNIGHT_MS : PLACE_MS}
				frame={cover}
				name={place.name}
				onBack={onBack}
				onEnd={onEnd}
				words={words}
			/>
		);
	}
	return (
		<MediaPlayer
			audio={audio}
			clip={place.video}
			cover={cover}
			key={`${place.video}|${audio?.url}`}
			name={place.name}
			onBack={onBack}
			onEnd={onEnd}
			onMediaError={onMediaError}
			timerMs={goodnight ? GOODNIGHT_MS : PLACE_MS}
			words={words}
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
		maxHeight: NARRATION_MAX_HEIGHT,
		overflow: "hidden",
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
