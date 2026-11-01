import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// The question the child just asked, between Listening and the start of the adventure. It stays
// on the device (AsyncStorage: browser storage on the web, app storage on a phone) so a reload of
// "Did I hear you right?" keeps it, and never travels in the page address (so never lands in
// browser history). It is cleared once the adventure is started: the adventure's id takes over.

interface Spoken {
	/** The raw transcript the adventure is made from. */
	question: string;
	/** The one short line the grown-up confirms. */
	short: string;
}

const EMPTY: Spoken = { question: "", short: "" };

export const useSpokenQuestion = create<Spoken>()(
	persist(() => EMPTY, {
		name: "spoken-question",
		storage: createJSONStorage(() => AsyncStorage),
	})
);

export const setSpokenQuestion = (question: string, short = "") =>
	useSpokenQuestion.setState({ question, short });

export const getSpokenQuestion = (): string =>
	useSpokenQuestion.getState().question;

/** Once the adventure exists (or the account signs out), the child's words are dropped. */
export const clearSpokenQuestion = () => useSpokenQuestion.setState(EMPTY);

/** False until the stored question is read back after a reload (storage is async on a phone). */
export function useSpokenHydrated(): boolean {
	const [hydrated, setHydrated] = useState(() =>
		useSpokenQuestion.persist.hasHydrated()
	);
	useEffect(() => {
		const stop = useSpokenQuestion.persist.onFinishHydration(() =>
			setHydrated(true)
		);
		setHydrated(useSpokenQuestion.persist.hasHydrated());
		return stop;
	}, []);
	return hydrated;
}
