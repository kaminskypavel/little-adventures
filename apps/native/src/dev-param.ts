/**
 * Dev-only query params exist to reach states for the demo capture. A production build
 * ignores them: `dev(param)` returns the param in development and undefined otherwise.
 */
export function dev<T>(param: T | undefined): T | undefined {
	// biome-ignore lint/correctness/noUndeclaredVariables: __DEV__ is a Metro global
	return __DEV__ ? param : undefined;
}
