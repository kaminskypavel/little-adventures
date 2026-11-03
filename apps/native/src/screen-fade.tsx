// The soft hand-over between the screens of an adventure: the night sky closes over the old
// screen (1 s), holds for a breath on the full sky (450 ms), and opens on the new one
// (1 s). The music bed fades with it (music-store `setFaded`: down with the closing, silent in
// the hold, back up with the opening) and the narration is let down too. Navigation never waits
// on the animation: timers, not its callbacks, decide when to go and when the hold ends.
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { skyPalettes } from "@little-adventures/native-ui/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { StyleSheet } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { rampVolume } from "@/src/data/music-rules";
import { useMusic } from "@/src/data/music-store";

/** The sky closes over a screen: `--ease-in-out`, 1 s (the user asked for a longer fade). */
export const PAGE_OUT_MS = 1000;
const PAGE_OUT_EASING = Easing.inOut(Easing.ease);
/** A breath on the full sky before the next screen opens. */
export const PAGE_HOLD_MS = 450;
/** The sky opens on a screen: `--ease-smooth-out`, 1 s. */
export const PAGE_IN_MS = 1000;
const PAGE_IN_EASING = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * The place plays only once the sky is clear again: this long after the sky starts to open (the
 * whole fade-in), the picture stands still on the cover until then. One line to tune.
 */
export const PLAY_AFTER_OPEN_MS = PAGE_IN_MS;
/** The narration comes up from silence over this long when it first speaks (ease-out). */
export const NARRATION_RAMP_MS = 500;

/** How long after a screen began to leave a new one still counts as its neighbour. */
const HANDOVER_MS = 3000;
// Until when the screen that comes next opens from the sky: set when a screen begins to leave
// through `leave`. A screen reached any other way (a reload, a link) simply appears.
let handoverUntil = 0;

interface Volume {
	volume: number;
}
// The narration players of the place on screen: they are let down while it leaves.
let voices: Volume[] = [];

/** The place's audio players, so leaving the place fades the narration out with the picture. */
export function useLeaveVoices(players: Volume[]) {
	useEffect(() => {
		voices = players;
		return () => {
			if (voices === players) {
				voices = [];
			}
		};
	});
}

/** Starts a narration player from silence and brings it up to full over `NARRATION_RAMP_MS`. */
export function rampVoiceIn(voice: Volume) {
	const began = Date.now();
	voice.volume = 0;
	const timer = setInterval(() => {
		const t = Math.min(1, (Date.now() - began) / NARRATION_RAMP_MS);
		try {
			voice.volume = 1 - (1 - t) ** 2;
		} catch {
			clearInterval(timer);
		}
		if (t >= 1) {
			clearInterval(timer);
		}
	}, 50);
}

function fadeVoices(ms: number) {
	for (const voice of voices) {
		const from = voice.volume;
		const began = Date.now();
		const timer = setInterval(() => {
			const elapsed = Date.now() - began;
			try {
				voice.volume = rampVolume(from, 0, elapsed, ms);
			} catch {
				clearInterval(timer);
			}
			if (elapsed >= ms) {
				clearInterval(timer);
			}
		}, 50);
	}
}

type LeaveFn = (go: () => void) => void;
// The leave of the screen in front, so the shared back button can close its screen too.
let active: LeaveFn | null = null;

/** Goes through the screen in front's sky when it has one, else straight away. */
export const leaveActive: LeaveFn = (go) => (active ? active(go) : go());

/**
 * The sky of a screen. `veil` goes last in the screen (it covers everything); `leave(go)` closes
 * the screen, then calls `go` (the navigation). The screen opens from the sky when the screen
 * before it left through `leave`, and `held` is true until the sky is clear again: the place waits
 * on it, so nothing plays (and no narration speaks) under a closing or opening sky. With reduced motion there is no sky:
 * `leave` goes at once.
 */
export function useScreenFade(): {
	held: boolean;
	leave: LeaveFn;
	veil: ReactNode;
} {
	const calm = useCalm();
	const [opening] = useState(() => !calm && Date.now() < handoverUntil);
	const [held, setHeld] = useState(opening);
	const opacity = useSharedValue(opening ? 1 : 0);
	const leaving = useRef<boolean>(false);
	const goTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const playTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const leave = useCallback<LeaveFn>(
		(go) => {
			if (leaving.current) {
				return;
			}
			leaving.current = true;
			if (calm) {
				go();
				return;
			}
			handoverUntil = Date.now() + PAGE_OUT_MS + HANDOVER_MS;
			try {
				opacity.set(
					withTiming(1, { duration: PAGE_OUT_MS, easing: PAGE_OUT_EASING })
				);
				fadeVoices(PAGE_OUT_MS);
				useMusic.getState().setFaded(true, PAGE_OUT_MS);
			} catch {
				// A failed animation must not hold the screen: it goes anyway.
			}
			goTimer.current = setTimeout(go, PAGE_OUT_MS);
		},
		[calm, opacity]
	);

	// Each time the screen comes to the front (also when a screen above it goes): open from the
	// sky if the last screen left through it, else be clear at once.
	useFocusEffect(
		useCallback(() => {
			leaving.current = false;
			active = leave;
			const music = useMusic.getState();
			if (calm || Date.now() >= handoverUntil) {
				opacity.set(0);
				setHeld(false);
				music.setFaded(false, calm ? 0 : PAGE_IN_MS);
			} else {
				opacity.set(1);
				setHeld(true);
				// The place is let go (held false) when the sky is clear, not when it begins to open.
				playTimer.current = setTimeout(
					() => setHeld(false),
					PAGE_HOLD_MS + PLAY_AFTER_OPEN_MS
				);
				holdTimer.current = setTimeout(() => {
					music.setFaded(false, PAGE_IN_MS);
					opacity.set(
						withTiming(0, { duration: PAGE_IN_MS, easing: PAGE_IN_EASING })
					);
				}, PAGE_HOLD_MS);
			}
			return () => {
				clearTimeout(holdTimer.current);
				clearTimeout(playTimer.current);
				clearTimeout(goTimer.current);
				if (active === leave) {
					active = null;
				}
			};
		}, [calm, leave, opacity])
	);

	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	const veil = (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, style]}
		>
			<LinearGradient
				colors={skyPalettes.night.colors}
				locations={skyPalettes.night.locations}
				style={StyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
	return { held, leave, veil };
}
