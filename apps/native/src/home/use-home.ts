import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
	devFlags,
	homeOptions,
	ideasOptions,
} from "@/src/data/adventure-client";
import { micBlocked } from "@/src/data/mic-permission";
import { useChild, useChildren } from "@/src/data/profile-queries";
import { prefetchAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";
import { useLanguage } from "@/src/i18n";

// How many stories on the shelf are read ahead.
const SHELF_AHEAD = 4;

/**
 * What Home shows: the child, the child's adventures (unfinished first, then finished, each newest
 * first) and the ideas. `adventures` and `ideas` are null while they load. A story list that
 * cannot be read shows as none, never as a skeleton for ever.
 */
export function useHomeData(first: string | undefined) {
	const child = useChild();
	const children = useChildren();
	const refetchChild = child.refetch;
	// Each language has its own list, so the shelf is read again when it changes.
	const home = useQuery(homeOptions(useLanguage()));
	const refetchHome = home.refetch;
	const ideas = useQuery(ideasOptions());

	useFocusEffect(
		useCallback(() => {
			// Dev query: /home?first=1 shows the first-home state (no stories yet).
			if (first !== undefined) {
				devFlags.isFirstHome = first === "1";
			}
			// The cached list and child paint at once; both are read again on every focus (fresh
			// picture urls). A read already running is kept, unless the dev query must apply.
			refetchHome({ cancelRefetch: first !== undefined });
			refetchChild({ cancelRefetch: false });
		}, [first, refetchChild, refetchHome])
	);

	// The stories on the shelf are read ahead, pictures and all, so a tap opens a finished map.
	const shelf = home.data;
	useEffect(() => {
		for (const story of shelf?.slice(0, SHELF_AHEAD) ?? []) {
			prefetchAdventure(story.id).catch(() => undefined);
		}
	}, [shelf]);

	return {
		adventures: home.data ?? null,
		avatar: child.data?.avatar ?? null,
		childCount: children?.length ?? 0,
		childId: child.data?.id,
		ideas: ideas.data ?? null,
		name: child.data?.profile.childName ?? null,
	};
}

/**
 * True when the mic is off: refused for good, so only the phone's Settings can turn it on (read
 * on every focus and whenever the app comes back to the foreground, so a grown-up who turns it on
 * in Settings finds it on when they return), or `?mic=off` in development. `recheck` reads it
 * again after the system asked and the answer was no.
 */
export function useMicOff(mic: string | undefined) {
	const [blocked, setBlocked] = useState(false);
	const recheck = useCallback(() => {
		micBlocked()
			.then(setBlocked)
			.catch(() => undefined);
	}, []);
	useFocusEffect(
		useCallback(() => {
			let live = true;
			const read = () =>
				micBlocked()
					.then((now) => live && setBlocked(now))
					.catch(() => undefined);
			read();
			const sub = AppState.addEventListener("change", (state) => {
				if (state === "active") {
					read();
				}
			});
			return () => {
				live = false;
				sub.remove();
			};
		}, [])
	);
	const off = dev(mic) === "off" || blocked;
	return { off, recheck };
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
