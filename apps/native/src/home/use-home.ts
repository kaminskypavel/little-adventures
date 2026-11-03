import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
	devFlags,
	homeOptions,
	ideasOptions,
} from "@/src/data/adventure-client";
import { micPermission } from "@/src/data/mic-permission";
import { useChild, useChildren } from "@/src/data/profile-queries";
import { prefetchAdventure } from "@/src/data/use-adventure";
import { dev } from "@/src/dev-param";

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
	const home = useQuery(homeOptions());
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
 * True when the mic is off: denied in the phone's settings (read on every focus and whenever the
 * app comes back to the foreground, so a grown-up who turns it on in Settings finds it on when
 * they return), or `?mic=off` in development. `deny` marks it denied when the system says no.
 */
export function useMicOff(mic: string | undefined) {
	const [denied, setDenied] = useState(false);
	useFocusEffect(
		useCallback(() => {
			let live = true;
			const read = () =>
				micPermission()
					.then((status) => live && setDenied(status === "denied"))
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
	const off = dev(mic) === "off" || denied;
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
