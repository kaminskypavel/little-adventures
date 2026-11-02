import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { devFlags, getHome, getIdeas } from "@/src/data/adventure-client";
import { micPermission } from "@/src/data/mic-permission";
import { useChild } from "@/src/data/profile-queries";
import type { AdventureSummary, Idea } from "@/src/data/types";
import { dev } from "@/src/dev-param";

/**
 * What Home shows: the child, the child's adventures (unfinished first, then finished, each newest
 * first) and the ideas. `adventures` and `ideas` are null while they load. A story list that
 * cannot be read shows as none, never as a skeleton for ever.
 */
export function useHomeData(first: string | undefined) {
	const child = useChild();
	const refetchChild = child.refetch;
	const [adventures, setAdventures] = useState<AdventureSummary[] | null>(null);
	const [ideas, setIdeas] = useState<Idea[] | null>(null);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			// Dev query: /home?first=1 shows the first-home state (no stories yet).
			if (first !== undefined) {
				devFlags.isFirstHome = first === "1";
			}
			getHome()
				.then((home) => [...home.keepGoing, ...home.finished])
				.catch(() => [])
				.then((list) => live && setAdventures(list));
			// Read the child again on every focus (fresh picture urls); a read already running is kept.
			refetchChild({ cancelRefetch: false });
			return () => {
				live = false;
			};
		}, [first, refetchChild])
	);

	useEffect(() => {
		let live = true;
		getIdeas().then((list) => live && setIdeas(list));
		return () => {
			live = false;
		};
	}, []);

	return {
		adventures,
		avatarUrl: child.data?.avatarUrl ?? null,
		ideas,
		name: child.data?.profile.childName ?? null,
	};
}

/**
 * True when the mic is off: denied in the phone's settings (read on every focus, so a grown-up who
 * turns it on finds it on when they come back), `?mic=off` in development, or Android, which is
 * not a launch target and has no WAV recorder. `deny` marks it denied when the system says no.
 */
export function useMicOff(mic: string | undefined) {
	const [denied, setDenied] = useState(false);
	useFocusEffect(
		useCallback(() => {
			let live = true;
			micPermission()
				.then((status) => live && setDenied(status === "denied"))
				.catch(() => undefined);
			return () => {
				live = false;
			};
		}, [])
	);
	const off = dev(mic) === "off" || denied || Platform.OS === "android";
	return { deny: () => setDenied(true), off };
}

/**
 * Counts focuses: each one waves the stars again. The first focus is the mount, which already
 * plays the wave.
 */
export function useFocusRun() {
	const [run, setRun] = useState(0);
	const seen = useRef<boolean>(false);
	useFocusEffect(
		useCallback(() => {
			if (seen.current) {
				setRun((n) => n + 1);
			}
			seen.current = true;
		}, [])
	);
	return run;
}
