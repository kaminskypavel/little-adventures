import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

const KEY = "auth.token";

/** The signed-in JWT lives in the device keychain. */
export const readToken = () => getItemAsync(KEY);
export const writeToken = (token: string) => setItemAsync(KEY, token);
export const clearToken = () => deleteItemAsync(KEY);
