/**
 * The one decision for showing anything admin-only: true only when the engine's answer says
 * `isAdmin === true`. Loading, error, no engine (null), a missing field and truthy
 * non-booleans ("true", 1, {}) all hide.
 */
export const isAdminMe = (me: unknown): boolean =>
	typeof me === "object" &&
	me !== null &&
	(me as { isAdmin?: unknown }).isAdmin === true;
