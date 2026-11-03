import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deviceStorage } from "./device-storage";

// Which of the account's children is listening. Kept on the phone (AsyncStorage) and readable
// outside React, so the adventure client asks the same child the screens show. Null, or an id
// the server no longer lists, means the first child (see toChild).
export const useCurrentChild = create<{ id: string | null }>()(
	persist<{ id: string | null }>(() => ({ id: null }), {
		name: "current-child",
		storage: deviceStorage(),
	})
);

export const getCurrentChildId = (): string | null =>
	useCurrentChild.getState().id;

export const setCurrentChildId = (id: string) =>
	useCurrentChild.setState({ id });

/** Resolves once the stored id is read back (storage is async on a phone). */
export const currentChildReady = (): Promise<void> =>
	useCurrentChild.persist.hasHydrated()
		? Promise.resolve()
		: new Promise((resolve) => {
				const stop = useCurrentChild.persist.onFinishHydration(() => {
					stop();
					resolve();
				});
			});
