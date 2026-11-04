import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { FallbackImage } from "@little-adventures/native-ui/fallback-image";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { Icon } from "@little-adventures/native-ui/icons";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
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
import { CastButton } from "@/src/cast/cast-button";
import { useCastConnected, useTvRemote } from "@/src/cast/use-cast";
import { castPlace } from "@/src/data/adventure-client";
import { useIsDemo } from "@/src/data/demo-store";
import { speakingAt } from "@/src/data/music-rules";
import { usePlayerMusic } from "@/src/data/music-store";
import {
	begin,
	COVER_FADE_MS,
	DISSOLVE_MS,
	DISSOLVE_REDUCED_MS,
	type EndCause,
	GRACE_MS,
	graceDue,
	hasParts,
	LEAD_FADE_MS,
	LEAD_ZOOM_MS,
	LEAD_ZOOM_TO,
	leadHolding,
	leadHoldMs,
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
	stepRate,
	tailWordsLeft,
	upcoming,
	voiceRate,
	voiceSlot,
	voiceUrls,
	wordsStart,
} from "@/src/data/parts";
import { placeProgress } from "@/src/data/place-progress";
import { wordIndexAt } from "@/src/data/playback";
import { useChildName } from "@/src/data/profile-queries";
import { useGate, useGatePhase } from "@/src/data/question-gate";
import { learnedRows, openingOf } from "@/src/data/question-rules";
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
import { isRtl, useLanguage, useT } from "@/src/i18n";
import { placeStrings } from "@/src/i18n/strings/place";
import { LandscapeChrome } from "@/src/landscape-chrome";
import { useLandscape } from "@/src/orientation";
import {
	ChromeFade,
	LessonCard,
	QuestionCard,
	RecapCard,
} from "@/src/place-cards";
import { rampVoiceIn, useLeaveVoices, useScreenFade } from "@/src/screen-fade";

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

/** The Cast button; the recorded demo has no TV to send to. */
function PlaceCastButton() {
	return useIsDemo() ? null : <CastButton />;
}

/**
 * What the player shows, whatever keeps its time: a full-frame picture or clip, a back-to-map
 * button with the place name, the words being read, and one big pause button.
 */
function PlayerChrome({
	cast,
	current,
	frame,
	name,
	onBack,
	onToggle,
	playing,
	progress,
	words,
}: {
	/** The Cast button, in the corner opposite the map button. */
	cast?: ReactNode;
	current: number;
	frame: ReactNode;
	name: string;
	onBack: () => void;
	onToggle: () => void;
	playing: boolean;
	progress: number | SharedValue<number>;
	words: string[];
}) {
	const t = useT(placeStrings);
	const language = useLanguage();
	const insets = useSafeAreaInsets();
	const sideways = useLandscape();
	const { end, start } = useMemo(
		() => readWindow(words, current),
		[words, current]
	);
	const shown = useMemo(() => words.slice(start, end), [words, start, end]);
	const bottom = insets.bottom + layout.dockBottom;
	if (sideways) {
		return (
			<View style={styles.root} testID="place-player">
				{frame}
				<ChromeFade>
					<Scrim />
					<LandscapeChrome
						current={current - start}
						name={name}
						onBack={onBack}
						onToggle={onToggle}
						playing={playing}
						progress={progress}
						words={shown}
					/>
				</ChromeFade>
			</View>
		);
	}
	return (
		<View style={styles.root} testID="place-player">
			{frame}
			<ChromeFade>
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
						accessibilityLabel={t("backToMap")}
						icon="map"
						onPress={onBack}
					/>
					<View style={styles.name}>
						<NamePill style={styles.pill} text={name} />
					</View>
					{/* Balances the map button, so the name sits in the middle like every title. */}
					<View style={styles.balance}>{cast}</View>
				</View>
				<NarrationBar
					current={current - start}
					progress={progress}
					rtl={isRtl(language)}
					style={[
						styles.narration,
						{ bottom: bottom + layout.primaryHeight + layout.gap },
					]}
					words={shown}
				/>
				<View pointerEvents="box-none" style={[styles.control, { bottom }]}>
					<ClayPressable
						accessibilityLabel={playing ? t("pause") : t("play")}
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
			</ChromeFade>
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
	held,
	name,
	node,
	onBack,
	onEnd,
	words,
}: {
	durationMs: number;
	frame: ReactNode;
	held: boolean;
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
		if (held) {
			return;
		}
		run();
		return () => cancelAnimation(progress);
	}, [held, progress, run]);

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

/** How close to its end a voice that stopped counts as finished (status ticks are coarse). */
const VOICE_END_SLACK_SEC = 0.25;

/** A part player: muted, no loop, and it reports its time often enough to hand over on time. */
const setupPlayer = (created: VideoPlayer) => {
	created.loop = false;
	created.muted = true;
	// No playbackRate here: on iOS setting it sets AVPlayer.rate, which starts the player, and the
	// next part would play itself out unseen before its turn. The default is already 1.
	created.timeUpdateEventInterval = PART_TICK_SEC;
};

/** A narration tick only repaints the screen when it moved the parts. */
const moved = (a: PlayState, b: PlayState) =>
	a.at !== b.at ||
	a.half !== b.half ||
	a.fading !== b.fading ||
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

// A video element keeps its own size when only its edges are set (on the web it was 832x480 on an
// 844x390 screen), so the width and height are set too.
const VIDEO_FILL = StyleSheet.create({
	fill: {
		bottom: 0,
		height: "100%",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
		width: "100%",
	},
}).fill;

/**
 * One part's picture, in a layer of its own: shown when it is `on`, unseen but mounted when not.
 * The two layers keep their order (slot 1 above slot 0) and only the top one ever fades, so no
 * native video view is re-stacked. While `dissolve` is set, a part is taking over from another:
 * - slot 1 takes over: it fades in over `ms` above slot 0, which holds its last frame;
 * - slot 0 takes over: it shows at once beneath slot 1, which fades out over `ms`.
 * When the dissolve is over the outgoing layer is hidden.
 */
function PartLayer({
	dissolve,
	ms,
	on,
	onFirstFrame,
	player,
	slot,
}: {
	dissolve: boolean;
	ms: number;
	on: boolean;
	onFirstFrame: () => void;
	player: VideoPlayer;
	slot: Slot;
}) {
	const opacity = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		if (!dissolve) {
			opacity.set(on ? 1 : 0);
		} else if (slot === 1) {
			opacity.set(
				withTiming(on ? 1 : 0, {
					duration: ms,
					easing: Easing.inOut(Easing.ease),
				})
			);
		} else if (on) {
			opacity.set(1);
		}
	}, [dissolve, ms, on, opacity, slot]);
	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, style]}
		>
			<VideoView
				allowsPictureInPicture={false}
				contentFit="cover"
				nativeControls={false}
				onFirstFrameRender={onFirstFrame}
				player={player}
				playsInline
				pointerEvents="none"
				style={VIDEO_FILL}
				// Android: a SurfaceView ignores the layer's opacity, so the hidden next part drew over
				// the part playing and the first part showed as a still. A TextureView fades with it.
				surfaceType="textureView"
			/>
		</Animated.View>
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
	held: skyClosed,
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
	/** The sky is still closed over this place: it does not begin until it opens. */
	held: boolean;
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
	useLeaveVoices([audioPlayer, ...voices]);
	const held = slotParts(view);
	const player0 = useVideoPlayer(held[0]?.url ?? null, setupPlayer);
	const player1 = useVideoPlayer(held[1]?.url ?? null, setupPlayer);
	const players = [player0, player1] as const;
	const [status0, setStatus0] = useState(player0.status);
	const [status1, setStatus1] = useState(player1.status);
	const statuses = [status0, status1] as const;
	const [framed, setFramed] = useState(false);
	// The picture stays mounted while it dissolves into the video, then goes.
	const [coverGone, setCoverGone] = useState(false);
	useEffect(() => {
		if (!framed) {
			setCoverGone(false);
			return;
		}
		const timer = setTimeout(() => setCoverGone(true), COVER_FADE_MS);
		return () => clearTimeout(timer);
	}, [framed]);
	// How far through the whole place (every part together) the video is, read on the UI thread.
	const progress = useSharedValue(0);
	const seenSec = useRef<number[]>([]);
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
	// The place's first words come up from silence (not with reduced motion), later ones do not.
	const calm = useCalm();
	const firstWords = useRef<boolean>(true);
	const softStart = useCallback(
		(player: { volume: number }) => {
			if (firstWords.current) {
				firstWords.current = false;
				if (!calm) {
					rampVoiceIn(player);
				}
			}
		},
		[calm]
	);
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
					softStart(audioPlayer);
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
		[audioPlayer, softStart]
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
			const player = voiceOf(machine.current);
			// Each part's words start at normal speed, whatever the tail of the last one did.
			player.setPlaybackRate(1, "high");
			softStart(player);
			player.play();
		}
	}, [softStart, speaking, voiceOf, voiceUrl]);
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
		if (duration > 0) {
			seenSec.current[index] = duration;
		}
		progress.set(
			placeProgress(
				machine.current.parts,
				seenSec.current,
				index,
				reachedEnd(currentTime, duration) ? duration : currentTime
			)
		);
		if (reachedEnd(currentTime, duration)) {
			if (inPart.current) {
				// A part cut short by its durationSec stops here, so the held frame is the last one shown.
				players[machine.current.slot].pause();
				send({ type: "ended" });
			}
		} else if (currentTime > 0) {
			inPart.current = true;
			showFrame(index);
			hurryWords(index, duration - currentTime);
			send({
				duration: duration || 0,
				sec: currentTime,
				type: "part-time",
			});
		}
	};

	// In the last seconds of a part whose words would outlast its video, the words speed up a
	// little (pitch kept) so they end with it and the next part follows at once. The rate eases a
	// tick at a time on the voice player, never on the video.
	const hurryWords = (index: number, videoLeft: number) => {
		const now = machine.current;
		if (now.at !== index) {
			return;
		}
		const voice = now.own ? voiceOf(now) : audioPlayer;
		// Only while it speaks; expo-audio keeps a rate set on a paused player for its next play.
		if (!voice.playing) {
			return;
		}
		const voiceSec = now.own ? voice.currentTime : 0;
		const wanted = voiceRate(videoLeft, tailWordsLeft(now, voiceSec));
		const next = stepRate(voice.playbackRate, wanted);
		if (next !== voice.playbackRate) {
			voice.setPlaybackRate(next, "high");
		}
	};

	const eventsOf = (slot: Slot): SlotEvents => ({
		// Only the player showing the part counts: a late event from the one before is not its end.
		onEnd: () => {
			const now = machine.current;
			if (now.slot === slot) {
				progress.set(
					placeProgress(
						now.parts,
						seenSec.current,
						now.at,
						Number.POSITIVE_INFINITY
					)
				);
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
				// Not while a dissolve shows this player's last frame: parking would rewind it.
				if (IS_WEB && currentTime > 0 && now.fading === null) {
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
	// Own audio: the audio of the part whose turn it is has ended. `didJustFinish` lasts one status
	// tick and the phone can miss it (the place then sat out the grace wait, frozen on its last
	// frame), so a voice that started for this half and now stands still at its end counts too.
	// endVoice ignores a repeat.
	const startedFor = useRef<[number, number]>([-1, -1]);
	const [v0, v1] = heardVoices;
	useEffect(() => {
		const now = machine.current;
		const slot = voiceSlot(now.half);
		const heardNow = slot === 0 ? v0 : v1;
		if (heardNow.playing) {
			startedFor.current[slot] = now.half;
		}
		const ranOut =
			startedFor.current[slot] === now.half &&
			!heardNow.playing &&
			heardNow.duration > 0 &&
			heardNow.currentTime >= heardNow.duration - VOICE_END_SLACK_SEC;
		if (now.own && now.speaking && (heardNow.didJustFinish || ranOut)) {
			mark("narration-end", { part: now.half + 1, place: node });
			send({ type: "voice-ended" });
		}
	}, [v0, v1, node, send]);
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
	const holdMs = leadHoldMs(view);
	useEffect(() => {
		if (!(waitingOnFirst && playing)) {
			return;
		}
		const timer = setTimeout(() => send({ type: "lead-timeout" }), holdMs);
		return () => clearTimeout(timer);
	}, [holdMs, playing, send, waitingOnFirst]);
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
	const slotStatus = statuses[view.slot];
	const ready =
		!skyClosed &&
		(!hasNarration || shownVoice.isLoaded || narrationFailed) &&
		!videoPending;
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
			const starting = view.slot === 0 ? player0 : player1;
			// Every part starts at normal speed, whatever the tail of the one before did.
			starting.playbackRate = 1;
			starting.play();
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
	// A part whose video landed late was given its file after play() was called: play again once
	// the file is loaded (a part already playing is not touched). Only a part that has been
	// started: before that (the sky still opening, a question card up) the picture stands still,
	// or the video runs ahead of its words and they spill past its end.
	const slotPlayer = view.slot === 0 ? player0 : player1;
	useEffect(() => {
		if (
			playing &&
			view.phase === "playing" &&
			slotStatus === "readyToPlay" &&
			started.current &&
			begun.current === view.at &&
			!inPart.current
		) {
			slotPlayer.play();
		}
	}, [playing, slotPlayer, slotStatus, view.at, view.phase]);

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
	// over the video's first frame. Otherwise it dissolves into the moving video (COVER_FADE_MS).
	const led = view.lead !== null;
	const showCover = led || !coverGone;
	const calmMotion = useReducedMotion();
	const zoom = leadZoom(view, calmMotion);
	// The dissolve into the next part, and when it is over the part before it is let go.
	const dissolveMs = calmMotion ? DISSOLVE_REDUCED_MS : DISSOLVE_MS;
	const dissolving = view.fading !== null;
	useEffect(() => {
		if (!dissolving) {
			return;
		}
		const timer = setTimeout(() => send({ type: "dissolved" }), dissolveMs);
		return () => clearTimeout(timer);
	}, [dissolveMs, dissolving, send]);
	const { current, read } = useReadAlong({
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
			{/* Both parts stay mounted, the next one unseen: its first frame is drawn while the
			    current part plays, so the dissolve into it starts at once instead of waiting for
			    a new video view to come up (about 2 s on an iPhone). They keep their order. */}
			{([0, 1] as const).map((slot) => (
				<PartLayer
					dissolve={view.fading !== null}
					key={slot}
					ms={dissolveMs}
					on={view.slot === slot}
					onFirstFrame={firstFrameOf(slot)}
					player={players[slot]}
					slot={slot}
				/>
			))}
			{showCover ? (
				<Cover
					fadeMs={led ? LEAD_FADE_MS : COVER_FADE_MS}
					gone={framed}
					zoom={zoom}
				>
					{cover}
				</Cover>
			) : null}
		</View>
	);

	return (
		<PlayerChrome
			cast={<PlaceCastButton />}
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

/**
 * The player while a TV is connected: the place as one video plays on the TV and this screen
 * keeps the picture, the words and the pause button. The words follow the TV's position. When
 * the TV cannot be given the video (not ready, or any failure) `onUnavailable` hands the place
 * back to the local player.
 */
function TvPlayer({
	audio,
	cover,
	held,
	id,
	name,
	node,
	onBack,
	onEnd,
	onUnavailable,
	posterUrl,
	words,
}: {
	audio: NarrationAudio | null;
	cover: ReactNode;
	/** The sky is still closed over this place: the TV is not asked until it opens. */
	held: boolean;
	id: string;
	name: string;
	node: NodeId;
	onBack: () => void;
	onEnd: () => void;
	onUnavailable: () => void;
	posterUrl: string | null;
	words: string[];
}) {
	const t = useT(placeStrings);
	const tv = useTvRemote();
	const [length, setLength] = useState(0);
	const loaded = useRef<boolean>(false);
	const ended = useRef<boolean>(false);

	// The latest of everything the one-time request below calls.
	const latest = useRef({ name, onUnavailable, posterUrl, tv });
	useLayoutEffect(() => {
		latest.current = { name, onUnavailable, posterUrl, tv };
	});

	// The phone may not reach the TV yet on the first render: loading then would fail and drop
	// the place back to the phone, so the request waits for it.
	const tvReady = tv.ready && !held;
	useEffect(() => {
		if (!tvReady) {
			return;
		}
		let live = true;
		const run = async () => {
			try {
				const media = await castPlace(id, node);
				if (!live) {
					return;
				}
				if (!media) {
					latest.current.onUnavailable();
					return;
				}
				await latest.current.tv.load({
					durationSec: media.durationSec,
					posterUrl: latest.current.posterUrl,
					subtitlesUrl: media.subtitlesUrl ?? null,
					title: latest.current.name,
					url: media.url,
				});
				loaded.current = true;
				if (live) {
					setLength(media.durationSec);
				}
			} catch {
				if (live) {
					latest.current.onUnavailable();
				}
			}
		};
		run();
		return () => {
			live = false;
			if (loaded.current) {
				latest.current.tv.stop();
			}
		};
	}, [id, node, tvReady]);

	const endRef = useRef(onEnd);
	useLayoutEffect(() => {
		endRef.current = onEnd;
	}, [onEnd]);
	// Only after this place's video is loaded: an end left from the last place must not end this one.
	const loadedHere = length > 0;
	useEffect(() => {
		if (loadedHere && tv.ended && !ended.current) {
			ended.current = true;
			mark("place-end", { detail: { cause: "tv" }, place: node });
			endRef.current();
		}
	}, [loadedHere, node, tv.ended]);

	const ready = length > 0;
	let label = t("tvGettingReady");
	if (ready) {
		label = tv.deviceName
			? t("playingOn", { device: tv.deviceName })
			: t("playingOnTv");
	}
	const frame = (
		<View style={StyleSheet.absoluteFill}>
			{cover}
			<View pointerEvents="none" style={styles.tvLabel}>
				<NamePill text={label} />
			</View>
		</View>
	);
	return (
		<PlayerChrome
			cast={<PlaceCastButton />}
			current={
				ready && audio ? wordIndexAt(audio.words, tv.position, length) : 0
			}
			frame={frame}
			name={name}
			onBack={onBack}
			onToggle={ready ? tv.toggle : () => undefined}
			playing={!ready || tv.playing}
			progress={ready ? tv.position / length : 0}
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

/** 12 Place video and 15 Goodnight video. It opens from the night veil and closes to it. */
export default function Place() {
	const { held, leave, veil } = useScreenFade();
	return (
		<>
			<PlaceScreen held={held} leave={leave} />
			{veil}
		</>
	);
}

/**
 * The chrome stays hidden from the moment a question is due until its card lets go. Set in a layout
 * effect, before the first paint, so the chrome never shows for a frame; never during render (React
 * forbids updating the chrome while another component renders).
 */
function useHideChrome(asking: boolean) {
	useLayoutEffect(() => {
		if (useGate.getState().asking !== asking) {
			useGate.setState({ asking });
		}
	}, [asking]);
}

/**
 * The card that may hold a place until it lets go: the child's question at an opening. It shows
 * once the sky is clear; `holding` keeps the player waiting meanwhile. (The goodnight's recap comes
 * after its scene, see PlaceScreen.)
 */
function useOpeningCard({
	adventure,
	childName,
	held,
	id,
	node,
}: {
	adventure: Adventure | null;
	childName: string | null | undefined;
	held: boolean;
	id: string;
	node: NodeId;
}): { card: ReactNode; holding: boolean } {
	const t = useT(placeStrings);
	const gateKey = `${id}:${node}`;
	const gate = useGatePhase(gateKey);
	const place = adventure?.places[node];
	const intro = node === "intro";
	const { audio, question } = openingOf(adventure, node);
	const asking = Boolean(question) && gate === "card";
	useHideChrome(asking);
	if (!(adventure && place)) {
		return { card: null, holding: held };
	}
	const carded = Boolean(question);
	let card: ReactNode = null;
	if (question && !held && gate !== "done") {
		card = (
			<QuestionCard
				audio={audio}
				by={intro && childName ? t("asked", { name: childName }) : undefined}
				gateKey={gateKey}
				question={question}
			/>
		);
	}
	return { card, holding: held || (carded && gate === "card") };
}

function PlaceScreen({
	held,
	leave,
}: {
	/** The sky is still closed: nothing plays yet, so the narration begins as the picture opens. */
	held: boolean;
	leave: ReturnType<typeof useScreenFade>["leave"];
}) {
	const t = useT(placeStrings);
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string; node?: string }>();
	const id = params.id ?? "box";
	const node = (params.node ?? "p1") as NodeId;
	const { adventure, onMediaError, visit } = useAdventure(id);
	// From the shared cache, so the place paints on its first frame.
	const childName = useChildName();

	const goodnight = node === "outro";
	const { card, holding } = useOpeningCard({
		adventure,
		childName,
		held,
		id,
		node,
	});

	// A connected TV plays the place; if it cannot (see TvPlayer) the place plays here.
	const castConnected = useCastConnected();
	const [tvOff, setTvOff] = useState(false);
	useEffect(() => {
		if (!castConnected) {
			setTvOff(false);
		}
	}, [castConnected]);
	const onTvUnavailable = useCallback(() => setTvOff(true), []);

	// The goodnight scene plays first; when it ends, "What we learned" sums up the places and its
	// Goodnight button leaves for the end. Any other place shows what we learned there (the lesson
	// card); its button dips quickly into pick-a-way.
	const [learned, setLearned] = useState(false);
	const [lesson, setLesson] = useState<string | null>(null);
	const leaveFor = useCallback(
		() =>
			leave(
				() =>
					router.replace(
						goodnight ? `/end?id=${id}` : `/choice?id=${id}&from=${node}`
					),
				!goodnight
			),
		[goodnight, id, leave, node, router]
	);
	// The visit is saved while the lesson is up (it takes about a second); pick-a-way needs it.
	const visited = useRef<Promise<unknown>>(Promise.resolve());
	const onEnd = useCallback(async () => {
		// A failed save must not hold the child here: pick-a-way reads what it can.
		visited.current = visit(node).catch(() => undefined);
		const here = adventure?.places[node];
		const fact = here?.question?.trim() ? here.fact.trim() : "";
		// The intro asks the child's own question; its lesson comes at the places, not here.
		if (fact && !goodnight && node !== "intro") {
			setLesson(fact);
			return;
		}
		await visited.current;
		if (goodnight && adventure && learnedRows(adventure).length > 0) {
			setLearned(true);
			return;
		}
		leaveFor();
	}, [adventure, goodnight, leaveFor, node, visit]);
	const afterLesson = useCallback(async () => {
		await visited.current;
		leaveFor();
	}, [leaveFor]);

	const onBack = useCallback(
		() => leave(() => router.replace(`/map?id=${id}`)),
		[id, leave, router]
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
		? t("moonGoodnight", { name: childName }).split(" ")
		: place.narration;
	const cover =
		goodnight && place.picture === null ? (
			<GoodnightFrame adventure={adventure} />
		) : (
			<PlaceFrame onError={onMediaError} picture={place.picture} />
		);

	const withCard = (player: ReactNode) => (
		<>
			{player}
			{card}
			{learned && adventure ? (
				<RecapCard onDone={leaveFor} rows={learnedRows(adventure)} />
			) : null}
			{lesson ? <LessonCard fact={lesson} onDone={afterLesson} /> : null}
		</>
	);
	if (audio === null && !hasParts(place.parts)) {
		return withCard(
			<TimerPlayer
				durationMs={goodnight ? GOODNIGHT_MS : PLACE_MS}
				frame={cover}
				held={holding}
				name={place.name}
				node={node}
				onBack={onBack}
				onEnd={onEnd}
				words={words}
			/>
		);
	}
	if (castConnected && !tvOff) {
		return withCard(
			<TvPlayer
				audio={audio}
				cover={cover}
				held={holding}
				id={id}
				key={node}
				name={place.name}
				node={node}
				onBack={onBack}
				onEnd={onEnd}
				onUnavailable={onTvUnavailable}
				posterUrl={
					typeof place.picture === "object"
						? (place.picture?.uri ?? null)
						: null
				}
				words={words}
			/>
		);
	}
	return withCard(
		<MediaPlayer
			audio={audio}
			cover={cover}
			hasPicture={place.picture !== null}
			held={holding}
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
	tvLabel: {
		alignItems: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: "42%",
	},
});
