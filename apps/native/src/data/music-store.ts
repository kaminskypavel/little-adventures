// One music bed for a whole adventure, from the map to the goodnight and the end screen. It lives
// here, outside any screen, so moving between map, place and choice never restarts it. The screens
// tell the store who is speaking and whether the player is paused; the store fades the volume.
import { type AudioPlayer, createAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { create } from "zustand";
import { bedVolume, FADE_MS, rampVolume } from "./music-rules";

// How often a fade sets the volume, in ms.
const FADE_TICK_MS = 50;

interface Music {
	adventureId: string | null;
	paused: boolean;
	setPaused: (paused: boolean) => void;
	setSpeaking: (speaking: boolean) => void;
	speaking: boolean;
	/** Plays the adventure's loop. The same adventure again changes nothing; null stops the bed. */
	start: (adventureId: string, url: string | null) => void;
	/** Fades the bed out and lets go of the player. */
	stop: () => void;
	url: string | null;
}

let player: AudioPlayer | null = null;
const fades = new Map<AudioPlayer, ReturnType<typeof setInterval>>();

function fade(target: AudioPlayer, to: number, done?: () => void) {
	clearInterval(fades.get(target));
	const from = target.volume;
	const began = Date.now();
	const timer = setInterval(() => {
		const elapsed = Date.now() - began;
		target.volume = rampVolume(from, to, elapsed);
		if (elapsed >= FADE_MS) {
			clearInterval(timer);
			fades.delete(target);
			done?.();
		}
	}, FADE_TICK_MS);
	fades.set(target, timer);
}

function release(target: AudioPlayer) {
	clearInterval(fades.get(target));
	fades.delete(target);
	target.remove();
}

export const useMusic = create<Music>((set, get) => ({
	adventureId: null,
	paused: false,
	setPaused: (paused) => {
		if (get().paused === paused) {
			return;
		}
		set({ paused });
		if (!player) {
			return;
		}
		if (paused) {
			player.pause();
		} else {
			player.play();
		}
	},
	setSpeaking: (speaking) => {
		if (get().speaking === speaking) {
			return;
		}
		set({ speaking });
		if (player && !get().paused) {
			fade(player, bedVolume(speaking));
		}
	},
	speaking: false,
	start: (adventureId, url) => {
		const now = get();
		if (url === null) {
			now.stop();
			return;
		}
		if (player && now.adventureId === adventureId && now.url === url) {
			return;
		}
		if (player) {
			release(player);
		}
		player = createAudioPlayer({ uri: url });
		player.loop = true;
		player.volume = 0;
		set({ adventureId, paused: false, speaking: false, url });
		player.play();
		fade(player, bedVolume(false));
	},
	stop: () => {
		const old = player;
		const wasPaused = get().paused;
		player = null;
		set({ adventureId: null, paused: false, speaking: false, url: null });
		if (!old) {
			return;
		}
		if (wasPaused) {
			release(old);
			return;
		}
		fade(old, 0, () => release(old));
	},
	url: null,
}));

export const stopMusic = () => useMusic.getState().stop();

/**
 * A player screen's hold on the bed: it ducks while `speaking`, and `paused` pauses it. Both let
 * go when the screen goes, so the map and the choice get the full bed again.
 */
export function usePlayerMusic(speaking: boolean, paused: boolean) {
	useEffect(() => {
		useMusic.getState().setSpeaking(speaking);
	}, [speaking]);
	useEffect(() => {
		useMusic.getState().setPaused(paused);
	}, [paused]);
	useEffect(
		() => () => {
			useMusic.getState().setSpeaking(false);
			useMusic.getState().setPaused(false);
		},
		[]
	);
}

/** Fades the bed out `delayMs` after the screen shows (the end screen). */
export function useFadeMusicOutAfter(delayMs: number) {
	useEffect(() => {
		const timer = setTimeout(stopMusic, delayMs);
		return () => clearTimeout(timer);
	}, [delayMs]);
}
