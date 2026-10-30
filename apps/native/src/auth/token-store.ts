import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

const KEY = "auth.token";

/** The signed-in JWT lives in the device keychain. */
export const readToken = () => getItemAsync(KEY);
export const writeToken = (token: string) => setItemAsync(KEY, token);
export const clearToken = () => deleteItemAsync(KEY);

const HELLO_KEY = "hello.seen";

/** Whether the grown-up welcome was shown on this device before (so it can say "Welcome back"). */
export const readHelloSeen = async () =>
	(await getItemAsync(HELLO_KEY)) === "1";
export const writeHelloSeen = () => setItemAsync(HELLO_KEY, "1");
