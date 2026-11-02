import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";

/** How long the star says "Hi {name}!" before it asks its question. */
export const GREETING_MS = 1600;

/**
 * 0: no greeting yet, 1: the star is greeting, 2: the greeting is done (back to the question).
 * It starts when Home is on screen again after the current child changed (the picker closes), never
 * on the first load or on a plain focus.
 */
export function useGreeting(childId: string | undefined) {
	const [phase, setPhase] = useState<0 | 1 | 2>(0);
	const focused = useIsFocused();
	const seen = useRef(childId);
	const pending = useRef<boolean>(false);

	useEffect(() => {
		if (childId && seen.current && childId !== seen.current) {
			pending.current = true;
		}
		if (childId) {
			seen.current = childId;
		}
		if (pending.current && focused) {
			pending.current = false;
			setPhase(1);
		}
	}, [childId, focused]);

	useEffect(() => {
		if (phase !== 1) {
			return;
		}
		const timer = setTimeout(() => setPhase(2), GREETING_MS);
		return () => clearTimeout(timer);
	}, [phase]);

	return phase;
}
