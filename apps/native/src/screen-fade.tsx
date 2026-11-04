// The soft hand-over between the screens of an adventure: the night sky closes over the old
// screen (0.4 s), holds for a breath on the full sky (120 ms), and opens on the new one
// (0.45 s); a quick dip (0.3 s out, straight back in over 0.35 s) when a place hands over to Pick a way. The music bed fades with it (music-store `setFaded`: down with the closing, silent in
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

/** The sky closes over a screen: `--ease-in-out`, 0.4 s (2.5 s in all was too long, 2026-11-04). */
export const PAGE_OUT_MS = 400;
const PAGE_OUT_EASING = Easing.inOut(Easing.ease);
/** A breath on the full sky before the next screen opens. */
export const PAGE_HOLD_MS = 120;
/** The sky opens on a screen: `--ease-smooth-out`, 0.45 s. */
export const PAGE_IN_MS = 450;
const PAGE_IN_EASING = Easing.bezier(0.22, 1, 0.36, 1);

/** The narration comes up from silence over this long when it first speaks (ease-out). */
export const NARRATION_RAMP_MS = 500;

interface Pace {
	hold: number;
	in: number;
	out: number;
}
const SLOW: Pace = { hold: PAGE_HOLD_MS, in: PAGE_IN_MS, out: PAGE_OUT_MS };
/** A place handing over to Pick a way after its lesson: a quick dip (the user found 2.5 s too long). */
const QUICK: Pace = { hold: 0, in: 350, out: 300 };

/** How long after a screen began to leave a new one still counts as its neighbour. */
const HANDOVER_MS = 3000;
// Until when the screen that comes next opens from the sky: set when a screen begins to leave
// through `leave`. A screen reached any other way (a reload, a link) simply appears.
let handoverUntil = 0;
// The pace of the hand-over under way: the next screen opens at the pace the last one left at.
let handoverPace = SLOW;

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

/** `quick`: a short dip instead of the slow sky, both closing this screen and opening the next. */
type LeaveFn = (go: () => void, quick?: boolean) => void;
// The leave of the screen in front, so the shared back button can close its screen too.
let active: LeaveFn | null = null;

/** Goes through the screen in front's sky when it has one, else straight away. */
export const leaveActive: LeaveFn = (go, quick) =>
	active ? active(go, quick) : go();

/**
 * The sky of a screen. `veil` goes last in the screen (it covers everything); `leave(go)` closes
 * the screen, then calls `go` (the navigation). The screen opens from the sky when the screen
 * before it left through `leave`, and `held` is true until the sky is clear again: the place waits
 * on it, so nothing plays (and no narration speaks) under a closing or opening sky. With reduced motion there is no sky:
 * `leave` goes at once.
 */
export function useScreenFade(): {
	held: boolean;
	/** How long the sky holds before this screen opens (0 when it simply appeared). */
	holdMs: number;
	leave: LeaveFn;
	veil: ReactNode;
} {
	const calm = useCalm();
	const [opening] = useState(() => !calm && Date.now() < handoverUntil);
	const [pace] = useState(() => handoverPace);
	const [held, setHeld] = useState(opening);
	const opacity = useSharedValue(opening ? 1 : 0);
	const leaving = useRef<boolean>(false);
	const goTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const playTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const leave = useCallback<LeaveFn>(
		(go, quick = false) => {
			if (leaving.current) {
				return;
			}
			leaving.current = true;
			if (calm) {
				go();
				return;
			}
			const out = quick ? QUICK : SLOW;
			handoverPace = out;
			handoverUntil = Date.now() + out.out + HANDOVER_MS;
			try {
				opacity.set(
					withTiming(1, { duration: out.out, easing: PAGE_OUT_EASING })
				);
				fadeVoices(out.out);
				useMusic.getState().setFaded(true, out.out);
			} catch {
				// A failed animation must not hold the screen: it goes anyway.
			}
			goTimer.current = setTimeout(go, out.out);
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
				music.setFaded(false, calm ? 0 : pace.in);
			} else {
				opacity.set(1);
				setHeld(true);
				// The place is let go (held false) when the sky is clear, not when it begins to open.
				playTimer.current = setTimeout(
					() => setHeld(false),
					pace.hold + pace.in
				);
				holdTimer.current = setTimeout(() => {
					music.setFaded(false, pace.in);
					opacity.set(
						withTiming(0, { duration: pace.in, easing: PAGE_IN_EASING })
					);
				}, pace.hold);
			}
			return () => {
				clearTimeout(holdTimer.current);
				clearTimeout(playTimer.current);
				clearTimeout(goTimer.current);
				if (active === leave) {
					active = null;
				}
			};
		}, [calm, leave, opacity, pace])
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
	return { held, holdMs: opening ? pace.hold : 0, leave, veil };
}
