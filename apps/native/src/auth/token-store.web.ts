// Web debug preview: the JWT lives in memory only. A reload mints a new one from the session cookie.
let token: string | null = null;

export const readToken = () => Promise.resolve(token);
export const writeToken = (next: string) => {
	token = next;
	return Promise.resolve();
};
export const clearToken = () => {
	token = null;
	return Promise.resolve();
};
