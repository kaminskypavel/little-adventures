// The phone's storage for the persisted zustand stores. On the web the page is also rendered on a
// server, where there is no window for AsyncStorage to read: the getter throws, createJSONStorage
// then gives undefined, and the store simply runs in memory there.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

export const deviceStorage = <S>() =>
	createJSONStorage<S>(() => {
		if (typeof window === "undefined") {
			throw new Error("no storage while rendering on the server");
		}
		return AsyncStorage;
	});
