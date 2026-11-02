import { lockAsync, type OrientationLock } from "expo-screen-orientation";

let wanted: OrientationLock | null = null;
let applied: OrientationLock | null = null;
let running = false;

/** Applies the latest wanted lock, then checks again: a newer call during the await wins. */
async function settle(): Promise<void> {
	if (wanted === null || wanted === applied) {
		running = false;
		return;
	}
	const next: OrientationLock = wanted;
	await lockAsync(next).catch(() => undefined);
	applied = next;
	await settle();
}

/**
 * Locks the phone to `lock`, one call at a time. Each lock is asynchronous: a quick map and back
 * could let the sideways lock land after the upright one and leave Home sideways. Calls are queued
 * so the phone always ends on the last one asked for.
 */
export function lockTo(lock: OrientationLock) {
	wanted = lock;
	if (running) {
		return;
	}
	running = true;
	settle();
}
