// The soft landing between the map, a place video and the pick-a-way screen: a navy veil (the
// same night navy as the dip between parts) that clears when a screen opens and closes before it
// goes. The music bed fades with it (music-store `setFaded`) and the narration is let down too.
// Navigation never waits on the animation: a timer, not its callback, decides when to go.
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { skyPalettes } from "@little-adventures/native-ui/tokens";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { StyleSheet } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { rampVolume } from "@/src/data/music-rules";
import { useMusic } from "@/src/data/music-store";

/** A screen opens from the veil: transitions.dev `--duration-very-slow`, with `--ease-smooth-out`. */
export const PAGE_IN_MS = 500;
const PAGE_IN_EASING = Easing.bezier(0.22, 1, 0.36, 1);
/** A screen closes to the veil, quicker than it opens: `--duration-medium`, with `--ease-in-out`. */
export const PAGE_OUT_MS = 350;
const PAGE_OUT_EASING = Easing.inOut(Easing.ease);

/** How long after a screen left a new one still counts as its neighbour and opens from the veil. */
const HANDOVER_MS = 3000;
// When the last screen began to leave through the veil: the next screen opens from it. A screen
// the grown-up reaches any other way (Home, a reload) simply appears.
let handoverUntil = 0;

const [NIGHT] = skyPalettes.night.colors;

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

interface Leave {
	/** Leave the music bed alone (the goodnight hands it to the end screen). */
	keepMusic?: boolean;
}

/**
 * The veil of a screen. `veil` goes last in the screen (it covers everything); `leave(go)`
 * closes the screen to the veil, then calls `go` (the navigation). The screen opens from the
 * veil when the screen before it left through `leave`. With reduced motion there is no veil:
 * `leave` goes at once.
 */
export function useScreenFade(): {
	leave: (go: () => void, options?: Leave) => void;
	veil: ReactNode;
} {
	const calm = useCalm();
	const [opening] = useState(() => !calm && Date.now() < handoverUntil);
	const opacity = useSharedValue(opening ? 1 : 0);
	const leaving = useRef<boolean>(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		handoverUntil = 0;
		useMusic.getState().setFaded(false, calm ? 0 : PAGE_IN_MS);
		if (opening) {
			opacity.set(
				withTiming(0, { duration: PAGE_IN_MS, easing: PAGE_IN_EASING })
			);
		}
		return () => {
			clearTimeout(timer.current);
			cancelAnimation(opacity);
		};
	}, [calm, opacity, opening]);

	const leave = useCallback(
		(go: () => void, options?: Leave) => {
			if (leaving.current) {
				return;
			}
			leaving.current = true;
			if (calm) {
				go();
				return;
			}
			handoverUntil = Date.now() + HANDOVER_MS;
			try {
				opacity.set(
					withTiming(1, { duration: PAGE_OUT_MS, easing: PAGE_OUT_EASING })
				);
				fadeVoices(PAGE_OUT_MS);
				if (!options?.keepMusic) {
					useMusic.getState().setFaded(true, PAGE_OUT_MS);
				}
			} catch {
				// A failed animation must not hold the screen: it goes anyway.
			}
			timer.current = setTimeout(go, PAGE_OUT_MS);
		},
		[calm, opacity]
	);

	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	const veil = (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT }, style]}
		/>
	);
	return { leave, veil };
}
