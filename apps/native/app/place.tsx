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
import {
	useVideoPlayer,
	type VideoPlayer,
	type VideoPlayerStatus,
	VideoView,
} from "expo-video";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { speakingAt } from "@/src/data/music-rules";
import { usePlayerMusic } from "@/src/data/music-store";
import {
	begin,
	type EndCause,
	GRACE_MS,
	graceDue,
	hasParts,
	LEAD_FADE_MS,
	LEAD_HOLD_MS,
	LEAD_ZOOM_MS,
	LEAD_ZOOM_TO,
	leadHolding,
	leadZoom,
	neighbourUrls,
	ownVoices,
	type PlayEvent,
	type PlayState,
	playableSec,
	reachedEnd,
	type Slot,
	slotParts,
	step,
	upcoming,
	voiceSlot,
	voiceUrls,
	wordsStart,
} from "@/src/data/parts";
import { wordIndexAt } from "@/src/data/playback";
import { useChildName } from "@/src/data/profile-queries";
import { readWindow } from "@/src/data/read-window";
import { mark } from "@/src/data/timeline";
import type {
	Adventure,
	NarrationAudio,
	NodeId,
	Part,
	Picture,
} from "@/src/data/types";
import { useAdventure } from "@/src/data/use-adventure";
import { keepWarm } from "@/src/data/warm-parts";
import { useLandscape } from "@/src/orientation";

// Bundled narration length: how long the line takes to read before the screen moves on.
const PLACE_MS = 8000;
const GOODNIGHT_MS = 6000;
// How often the narration reports its time, in ms: often enough for the word chip to keep up.
const NARRATION_TICK_MS = 100;
// How often a part reports its time, in seconds: it shows that a frame is on screen and lets a
// part that never sends its end event still hand over within a tick of its last 0.1 s.
const PART_TICK_SEC = 0.1;
const IS_WEB = Platform.OS === "web";

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
// Sideways, the words share the bottom row with the pause button and the bar is slimmer.
const LANDSCAPE_NARRATION_MAX_HEIGHT = 150;
const LANDSCAPE_NARRATION = {
	borderRadius: 30,
	paddingBottom: 14,
	paddingTop: 12,
} as const;
// The goodnight picture sideways: this share of the frame height.
const GOAL_HEIGHT_SIDEWAYS = "78%";

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
	const sideways = useLandscape();
	const { end, start } = useMemo(
		() => readWindow(words, current),
		[words, current]
	);
	const shown = useMemo(() => words.slice(start, end), [words, start, end]);
	const bottom = insets.bottom + layout.dockBottom;
	return (
		<View style={styles.root} testID="place-player">
			{frame}
			<Scrim />
			<View
				pointerEvents="box-none"
				style={[
					styles.top,
					{
						left: insets.left + layout.sideMargin,
						right: insets.right + layout.sideMargin,
						top: insets.top + layout.topBarOffset,
					},
				]}
			>
				<IconButton
					accessibilityLabel="Back to the map"
					icon="map"
					onPress={onBack}
				/>
				<View style={styles.name}>
					<NamePill style={styles.pill} text={name} />
				</View>
				{/* Balances the map button, so the name sits in the middle like every title. */}
				<View style={styles.balance} />
			</View>
			<NarrationBar
				current={current - start}
				progress={progress}
				style={
					sideways
						? [
								styles.narration,
								styles.narrationSideways,
								LANDSCAPE_NARRATION,
								{
									bottom: bottom + (layout.primaryHeight - 76) / 2,
									left: insets.left + layout.sideMargin,
									right:
										insets.right +
										layout.sideMargin +
										layout.primaryHeight +
										layout.gap,
								},
							]
						: [
								styles.narration,
								{ bottom: bottom + layout.primaryHeight + layout.gap },
							]
				}
				words={shown}
			/>
			<View
				pointerEvents="box-none"
				style={[
					styles.control,
					sideways
						? {
								alignItems: "flex-end",
								paddingRight: insets.right + layout.sideMargin,
							}
						: null,
					{ bottom },
				]}
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
	node,
	onBack,
	onEnd,
	words,
}: {
	durationMs: number;
	frame: ReactNode;
	name: string;
	node: NodeId;
	onBack: () => void;
	onEnd: () => void;
	words: string[];
}) {
	const progress = useSharedValue(0);
	const [current, setCurrent] = useState(0);
	const [playing, setPlaying] = useState(true);
	usePlayerMusic(false, !playing);

	const endRef = useRef(onEnd);
	useLayoutEffect(() => {
		endRef.current = onEnd;
	}, [onEnd]);
	const fireEnd = useCallback(() => {
		mark("place-end", { detail: { cause: "grace" }, place: node });
		endRef.current();
	}, [node]);

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

/** A part player: muted, no loop, and it reports its time often enough to hand over on time. */
const setupPlayer = (created: VideoPlayer) => {
	created.loop = false;
	created.muted = true;
	created.timeUpdateEventInterval = PART_TICK_SEC;
};

/** A narration tick only repaints the screen when it moved the parts. */
const moved = (a: PlayState, b: PlayState) =>
	a.at !== b.at ||
	a.half !== b.half ||
	a.phase !== b.phase ||
	a.speaking !== b.speaking ||
	a.stall !== b.stall ||
	a.done !== b.done;

/** What one part player reports. */
interface SlotEvents {
	onEnd: () => void;
	onStatus: (status: VideoPlayerStatus) => void;
	onTime: (currentTime: number) => void;
}

function useSlotEvents(player: VideoPlayer, events: SlotEvents) {
	useEventListener(player, "statusChange", ({ status }) =>
		events.onStatus(status)
	);
	useEventListener(player, "timeUpdate", ({ currentTime }) =>
		events.onTime(currentTime)
	);
	useEventListener(player, "playToEnd", events.onEnd);
}

/**
 * On the web the part buffering for next plays, because a browser loads nothing before play();
 * once it has a frame it waits at the start, ready to show.
 */
const parkAtFirstFrame = (player: VideoPlayer) => {
	player.pause();
	player.currentTime = 0;
};

/**
 * The picture over the video. While the first part is still being made it zooms very slowly
 * (`zoom`; frozen where it is when the zoom stops); once the video has a frame (`gone`) it
 * fades out over `fadeMs`.
 */
function Cover({
	children,
	fadeMs,
	gone,
	zoom,
}: {
	children: ReactNode;
	fadeMs: number;
	gone: boolean;
	zoom: boolean;
}) {
	const scale = useSharedValue(1);
	const opacity = useSharedValue(1);
	useEffect(() => {
		if (zoom) {
			scale.set(
				withTiming(LEAD_ZOOM_TO, {
					duration: LEAD_ZOOM_MS,
					easing: Easing.inOut(Easing.ease),
				})
			);
		} else {
			cancelAnimation(scale);
		}
	}, [scale, zoom]);
	useEffect(() => {
		opacity.set(withTiming(gone ? 0 : 1, { duration: fadeMs }));
	}, [fadeMs, gone, opacity]);
	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ scale: scale.get() }],
	}));
	return (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, style]}
		>
			{children}
		</Animated.View>
	);
}

/** One part's picture. The part buffering for next, on the web, stays mounted but unseen. */
function PartVideo({
	hidden,
	onFirstFrame,
	player,
}: {
	hidden: boolean;
	onFirstFrame: () => void;
	player: VideoPlayer;
}) {
	return (
		<VideoView
			allowsPictureInPicture={false}
			contentFit="cover"
			nativeControls={false}
			onFirstFrameRender={onFirstFrame}
			player={player}
			playsInline
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, hidden ? styles.unseen : null]}
		/>
	);
}

/**
 * The audio players of a place. One narration for the place (older adventures), or two players
 * for the parts' own audios: the audio whose turn it is and the next, which loads meanwhile.
 * `shownVoice` is the status of the audio in turn (the last one's, once all have ended).
 */
function useNarrationAudio(view: PlayState, narrationUrl: string | null) {
	const options = { updateInterval: NARRATION_TICK_MS };
	const audioPlayer = useAudioPlayer(view.own ? null : narrationUrl, options);
	const heard = useAudioPlayerStatus(audioPlayer);
	const [url0, url1] = voiceUrls(view);
	const voice0 = useAudioPlayer(url0, options);
	const voice1 = useAudioPlayer(url1, options);
	const voices = [voice0, voice1] as const;
	// For the machine's callbacks, which must see the players a repaint has just swapped in.
	const voicesRef = useRef(voices);
	useLayoutEffect(() => {
		voicesRef.current = voices;
	});
	const heardVoices = [
		useAudioPlayerStatus(voice0),
		useAudioPlayerStatus(voice1),
	] as const;
	const voiceOf = useCallback(
		(now: PlayState) => voicesRef.current[voiceSlot(now.half)],
		[]
	);
	const shownPart = view.own
		? Math.max(0, Math.min(view.half, view.parts.length - 1))
		: 0;
	const shownVoice = view.own ? heardVoices[voiceSlot(shownPart)] : heard;
	return {
		audioPlayer,
		heard,
		heardVoices,
		shownPart,
		shownVoice,
		voiceOf,
		voices,
	};
}

/**
 * What the read-along shows and how the music ducks: the words and timings of the audio in turn
 * (the place's, or the part's own), the word being said, and the bed under whoever speaks.
 */
function useReadAlong({
	audio,
	hasNarration,
	paused,
	shownPart,
	shownVoice,
	view,
	words,
}: {
	audio: NarrationAudio | null;
	hasNarration: boolean;
	paused: boolean;
	shownPart: number;
	shownVoice: { currentTime: number; duration: number };
	view: PlayState;
	words: string[];
}) {
	const { own } = view;
	const voice = view.parts[shownPart]?.narration ?? null;
	const timings = (own ? voice?.words : audio?.words) ?? [];
	const spoken = hasNarration ? shownVoice.currentTime : 0;
	const length = hasNarration ? (voice?.durationSec ?? shownVoice.duration) : 0;
	const read = useMemo(
		() => (own ? timings.map((word) => word.text) : words),
		[own, timings, words]
	);
	// The bed ducks only while an audio is playing, not in the pauses between halves or audios.
	// An own audio that has just begun counts, so the bed does not pump between two audios.
	const speaking = hasNarration && view.speaking;
	const ducked = own
		? speaking && (spoken <= 0 || speakingAt(timings, spoken, length, false))
		: speaking && speakingAt(timings, spoken, length, view.narrationEnded);
	usePlayerMusic(ducked, paused);
	const said = hasNarration ? wordIndexAt(timings, spoken, length) : 0;
	return {
		current: own && view.narrationEnded ? Math.max(0, read.length - 1) : said,
		progress: length > 0 ? spoken / length : 0,
		read,
	};
}

/**
 * The player for an engine node: its video parts (muted) play back to back, each whole, and its
 * narration plays in halves, each centred inside its part (see parts.ts). The picture stays up
 * until the first part shows a frame. The place ends when the last part and the narration have
 * both ended; the last frame holds meanwhile. Two part players take turns: one shows the
 * current part, the other loads the next. The words follow the narration.
 *
 * A part may carry its own audio instead: each audio plays centred inside its part, on one of
 * two audio players that take turns (the next audio loads while the current part plays), and
 * the words follow whichever audio is playing.
 */
function MediaPlayer({
	audio,
	cover,
	hasPicture,
	name,
	node,
	onBack,
	onEnd,
	onMediaError,
	parts,
	words,
}: {
	audio: NarrationAudio | null;
	/** The picture, shown when there is no video and until the first part has a frame. */
	cover: ReactNode;
	/** The place has a real picture: it may lead while the first part is still being made. */
	hasPicture: boolean;
	name: string;
	node: NodeId;
	onBack: () => void;
	onEnd: () => void;
	onMediaError: () => void;
	parts: Part[];
	words: string[];
}) {
	// The machine in parts.ts is the truth (a ref, so events read it at once); `view` repaints.
	const [view, setView] = useState<PlayState>(() =>
		begin(parts, audio !== null || ownVoices(parts), hasPicture)
	);
	const machine = useRef<PlayState>(view);
	const { own } = view;
	const {
		audioPlayer,
		heard,
		heardVoices,
		shownPart,
		shownVoice,
		voiceOf,
		voices,
	} = useNarrationAudio(view, audio?.url ?? null);
	const held = slotParts(view);
	const player0 = useVideoPlayer(held[0]?.url ?? null, setupPlayer);
	const player1 = useVideoPlayer(held[1]?.url ?? null, setupPlayer);
	const players = [player0, player1] as const;
	const [status0, setStatus0] = useState(player0.status);
	const [status1, setStatus1] = useState(player1.status);
	const statuses = [status0, status1] as const;
	const [framed, setFramed] = useState(false);
	const [playing, setPlaying] = useState(true);
	// For the machine's callbacks, which must not wait for a repaint to know about a pause.
	const playingRef = useRef<boolean>(true);
	const started = useRef<boolean>(false);
	const begun = useRef<number>(-1);
	// Set once a tick shows the part part-way in, so a stale tick from the file a player held
	// before cannot end the part it has just been given.
	const inPart = useRef<boolean>(false);
	const ended = useRef<boolean>(false);
	const framedParts = useRef(new Set<number>());

	const narrationFailed = Boolean(shownVoice.error);
	const hasNarration = own || (audio !== null && !narrationFailed);

	const endRef = useRef(onEnd);
	useLayoutEffect(() => {
		endRef.current = onEnd;
	}, [onEnd]);
	const fireEnd = useCallback(
		(cause: EndCause) => {
			if (!ended.current) {
				ended.current = true;
				mark("place-end", { detail: { cause }, place: node });
				endRef.current();
			}
		},
		[node]
	);
	// The machine says the narration speaks or pauses: it plays from the start of the half, or stops.
	// (Own audio plays from an effect, once the player for the part's audio exists.)
	const voice = useCallback(
		(now: PlayState) => {
			if (now.own) {
				return;
			}
			if (!now.speaking) {
				audioPlayer.pause();
				return;
			}
			const play = () => {
				if (playingRef.current) {
					audioPlayer.play();
				}
			};
			const from = wordsStart(now, now.half);
			if (from > 0) {
				audioPlayer.seekTo(from).then(play, play);
			} else {
				play();
			}
		},
		[audioPlayer]
	);
	const send = useCallback(
		(event: PlayEvent) => {
			const before = machine.current;
			const next = step(before, event);
			if (next.state === before) {
				return;
			}
			machine.current = next.state;
			if (event.type !== "narration-time" || moved(before, next.state)) {
				setView(next.state);
			}
			if (next.state.speaking !== before.speaking) {
				voice(next.state);
			}
			for (const { holdMs, leadMs, name: markName, part, sec } of next.marks) {
				const detail = Object.fromEntries(
					Object.entries({ holdMs, leadMs, sec }).filter(
						([, value]) => value !== undefined
					)
				);
				mark(markName, {
					detail: Object.keys(detail).length > 0 ? detail : undefined,
					part,
					place: node,
				});
			}
			if (next.end) {
				fireEnd(next.end);
			}
		},
		[fireEnd, node, voice]
	);
	// Own audio plays when its half is due, on the player that holds its url (an audio that lands
	// late has its player made on the repaint that brings its url).
	const { speaking } = view;
	const voiceUrl = own ? voiceUrls(view)[voiceSlot(view.half)] : null;
	useEffect(() => {
		if (voiceUrl && speaking && playingRef.current) {
			voiceOf(machine.current).play();
		}
	}, [speaking, voiceOf, voiceUrl]);
	// The picture goes when a part shows its first frame; each part's mark is the first time only.
	const showFrame = useCallback(
		(index: number) => {
			if (!framedParts.current.has(index)) {
				framedParts.current.add(index);
				mark("first-frame", { part: index + 1, place: node });
			}
			setFramed(true);
		},
		[node]
	);

	// A tick of the part on screen: its first frame, or its end when no end event came.
	const tickPart = (index: number, currentTime: number, videoSec: number) => {
		const duration = playableSec(machine.current.parts[index], videoSec);
		if (reachedEnd(currentTime, duration)) {
			if (inPart.current) {
				// A part cut short by its durationSec stops here, so the held frame is the last one shown.
				players[machine.current.slot].pause();
				send({ type: "ended" });
			}
		} else if (currentTime > 0) {
			inPart.current = true;
			showFrame(index);
			send({
				duration: duration || 0,
				sec: currentTime,
				type: "part-time",
			});
		}
	};

	const eventsOf = (slot: Slot): SlotEvents => ({
		// Only the player showing the part counts: a late event from the one before is not its end.
		onEnd: () => {
			if (machine.current.slot === slot) {
				send({ type: "ended" });
			}
		},
		onStatus: (status) => {
			(slot === 0 ? setStatus0 : setStatus1)(status);
			const part = slotParts(machine.current)[slot];
			if (status === "error" && part) {
				send({ id: part.id, type: "bad" });
				onMediaError();
			}
		},
		onTime: (currentTime) => {
			const now = machine.current;
			if (now.slot !== slot) {
				if (IS_WEB && currentTime > 0) {
					parkAtFirstFrame(players[slot]);
				}
				return;
			}
			if (now.phase === "playing" && begun.current === now.at) {
				tickPart(now.at, currentTime, players[slot].duration);
			}
		},
	});
	useSlotEvents(player0, eventsOf(0));
	useSlotEvents(player1, eventsOf(1));
	const firstFrameOf = (slot: Slot) => () => {
		const now = machine.current;
		if (now.slot === slot && now.phase === "playing") {
			showFrame(now.at);
		}
	};

	useEffect(() => {
		send({ parts, type: "parts" });
	}, [parts, send]);
	useEffect(() => {
		if (!own && heard.didJustFinish) {
			mark("narration-end", { place: node });
			send({ type: "narration-ended" });
		}
	}, [heard.didJustFinish, node, own, send]);
	// Own audio: the audio of the part whose turn it is has ended.
	const finished0 = heardVoices[0].didJustFinish;
	const finished1 = heardVoices[1].didJustFinish;
	useEffect(() => {
		const now = machine.current;
		const done = voiceSlot(now.half) === 0 ? finished0 : finished1;
		if (now.own && now.speaking && done) {
			mark("narration-end", { part: now.half + 1, place: node });
			send({ type: "voice-ended" });
		}
	}, [finished0, finished1, node, send]);
	// The narration's time tells the machine when a half of the words is over.
	const heardSec = heard.currentTime;
	const heardLength = heard.duration;
	useEffect(() => {
		if (hasNarration && !own) {
			send({ length: heardLength, sec: heardSec, type: "narration-time" });
		}
	}, [hasNarration, heardLength, heardSec, own, send]);
	// A narration that fails stops holding the place up, after a moment for fresh urls to arrive.
	// Own audio: the audio in turn is skipped, once it is meant to be playing.
	const failedAt = narrationFailed ? shownPart : -1;
	useEffect(() => {
		if (failedAt < 0 || (own && !view.speaking)) {
			return;
		}
		const timer = setTimeout(
			() => send({ type: own ? "voice-ended" : "narration-ended" }),
			GRACE_MS
		);
		return () => clearTimeout(timer);
	}, [failedAt, own, send, view.speaking]);
	// The next part is still not here and the narration is done (or paused for it): wait a
	// little, then move on (end the place, or talk on over the held frame).
	const waitingOnPart = graceDue(view);
	useEffect(() => {
		if (!(waitingOnPart && playing)) {
			return;
		}
		const timer = setTimeout(() => send({ type: "grace" }), GRACE_MS);
		return () => clearTimeout(timer);
	}, [playing, send, waitingOnPart]);
	// The picture waits for part 1 only so long, then the words play over it.
	const waitingOnFirst = leadHolding(view);
	useEffect(() => {
		if (!(waitingOnFirst && playing)) {
			return;
		}
		const timer = setTimeout(
			() => send({ type: "lead-timeout" }),
			LEAD_HOLD_MS
		);
		return () => clearTimeout(timer);
	}, [playing, send, waitingOnFirst]);
	// A url that fails has most likely expired: ask for fresh ones (the first failure only).
	useEffect(() => {
		if (narrationFailed) {
			onMediaError();
		}
	}, [narrationFailed, onMediaError]);

	// The place begins once the narration is loaded and the first part can show. The narration
	// itself waits for its half (see parts.ts). Later parts start the moment they are on screen:
	// the next one has been loading while the last one played.
	const videoPending =
		view.phase === "playing"
			? statuses[view.slot] !== "readyToPlay"
			: view.at < 0 && upcoming(view) !== null;
	const ready =
		(!hasNarration || shownVoice.isLoaded || narrationFailed) && !videoPending;
	useEffect(() => {
		if (!playing) {
			return;
		}
		if (!started.current) {
			if (!ready) {
				return;
			}
			started.current = true;
			if (hasNarration) {
				send({ type: "started" });
			}
		}
		if (view.phase === "playing" && begun.current !== view.at) {
			begun.current = view.at;
			inPart.current = false;
			(view.slot === 0 ? player0 : player1).play();
		}
	}, [
		hasNarration,
		player0,
		player1,
		playing,
		ready,
		send,
		view.at,
		view.phase,
		view.slot,
	]);

	const toggle = () => {
		playingRef.current = !playing;
		if (started.current) {
			const now = machine.current;
			if (hasNarration && now.speaking) {
				setPaused(now.own ? voices[voiceSlot(now.half)] : audioPlayer, playing);
			}
			if (view.phase === "playing") {
				setPaused(players[view.slot], playing);
			}
		}
		setPlaying(!playing);
	};

	// The picture leads (it was on screen with the narration before the video): it fades away
	// over the video's first frame. Otherwise it goes at once, as before.
	const led = view.lead !== null;
	const showCover = led || !framed;
	const zoom = leadZoom(view, useReducedMotion());
	const { current, progress, read } = useReadAlong({
		audio,
		hasNarration,
		paused: !playing,
		shownPart,
		shownVoice,
		view,
		words,
	});
	const frame = (
		<View style={StyleSheet.absoluteFill}>
			{IS_WEB ? (
				<>
					<PartVideo
						hidden={view.slot !== 0}
						onFirstFrame={firstFrameOf(0)}
						player={player0}
					/>
					<PartVideo
						hidden={view.slot !== 1}
						onFirstFrame={firstFrameOf(1)}
						player={player1}
					/>
				</>
			) : (
				<PartVideo
					hidden={false}
					onFirstFrame={firstFrameOf(view.slot)}
					player={players[view.slot]}
				/>
			)}
			{showCover ? (
				<Cover fadeMs={led ? LEAD_FADE_MS : 0} gone={framed} zoom={zoom}>
					{cover}
				</Cover>
			) : null}
		</View>
	);

	return (
		<PlayerChrome
			current={current}
			frame={frame}
			name={name}
			onBack={onBack}
			onToggle={toggle}
			playing={playing}
			progress={progress}
			words={read}
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
	const sideways = useLandscape();
	return (
		<View
			style={[
				styles.goal,
				{
					backgroundColor: colors.goalBackdrop,
					paddingTop: sideways
						? insets.top + layout.topBarOffset
						: insets.top +
							layout.topBarOffset +
							layout.topBarHeight +
							layout.gap,
				},
			]}
		>
			<FallbackImage
				contentFit="contain"
				kind="goalOpen"
				source={adventure.endGoal.open}
				style={
					sideways
						? { aspectRatio: GOAL_RATIO, height: GOAL_HEIGHT_SIDEWAYS }
						: { aspectRatio: GOAL_RATIO, width: GOAL_WIDTH }
				}
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
	// From the shared cache, so the place paints on its first frame.
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
	// Android's back does what the map button does (the map was replaced by this place).
	useEffect(() => {
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			onBack();
			return true;
		});
		return () => sub.remove();
	}, [onBack]);

	// Each neighbour's first part starts loading as this place starts; the others are let go.
	const places = adventure?.places;
	useEffect(() => {
		if (places) {
			keepWarm(neighbourUrls(places, node));
		}
	}, [node, places]);

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

	if (audio === null && !hasParts(place.parts)) {
		return (
			<TimerPlayer
				durationMs={goodnight ? GOODNIGHT_MS : PLACE_MS}
				frame={cover}
				name={place.name}
				node={node}
				onBack={onBack}
				onEnd={onEnd}
				words={words}
			/>
		);
	}
	return (
		<MediaPlayer
			audio={audio}
			cover={cover}
			hasPicture={place.picture !== null}
			// By place and narration, never by a part's url: a part keeps playing when a read brings
			// other urls. A new narration url (fresh urls after a failed file) starts the place over.
			key={`${node}|${audio?.url}|${ownVoices(place.parts)}`}
			name={place.name}
			node={node}
			onBack={onBack}
			onEnd={onEnd}
			onMediaError={onMediaError}
			parts={place.parts}
			words={words}
		/>
	);
}

const styles = StyleSheet.create({
	balance: { width: layout.minTarget },
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
	name: { alignItems: "center", flex: 1 },
	narration: {
		left: layout.sideMargin,
		maxHeight: NARRATION_MAX_HEIGHT,
		overflow: "hidden",
		position: "absolute",
		right: layout.sideMargin,
	},
	narrationSideways: { maxHeight: LANDSCAPE_NARRATION_MAX_HEIGHT },
	pause: {
		alignItems: "center",
		height: layout.primaryHeight,
		justifyContent: "center",
		width: layout.primaryHeight,
	},
	pill: { alignSelf: "center" },
	root: { flex: 1 },
	top: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
	unseen: { opacity: 0 },
});
