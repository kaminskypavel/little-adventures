/**
 * Timing marks for a test harness. A plain append-only list: nothing leaves the device and
 * nothing renders from it. Read it from `globalThis.__laTimeline` or the `[la-timeline]` log.
 */
export type MarkName =
	| "start-tap"
	| "wait-ready"
	| "first-frame"
	| "part-end"
	| "narration-start"
	| "narration-end"
	| "place-end"
	| "stall-start"
	| "picture-lead-start"
	| "picture-lead-end"
	| "stall-end"
	| "choice"
	| "screen";

export interface Mark {
	/** Milliseconds since the epoch, from the clock. */
	at: number;
	detail?: Record<string, unknown>;
	name: MarkName;
	part?: number;
	place?: string;
}

export const PREFIX = "[la-timeline]";

// Development, and every web build (production web included). Production native is off.
// biome-ignore lint/correctness/noUndeclaredVariables: __DEV__ is a Metro global
const isDev = typeof __DEV__ !== "undefined" && __DEV__;
let enabled = isDev || process.env.EXPO_OS === "web";
let clock: () => number = Date.now;
const list: Mark[] = [];

/** Test hook: swap the clock or switch recording on or off. */
export function configureTimeline(options: {
	clock?: () => number;
	enabled?: boolean;
}) {
	clock = options.clock ?? clock;
	enabled = options.enabled ?? enabled;
}

/** Record one mark now. Does nothing when recording is off. */
export function mark(
	name: MarkName,
	extra: Pick<Mark, "detail" | "part" | "place"> = {}
) {
	if (!enabled) {
		return;
	}
	const entry: Mark = { at: clock(), name, ...extra };
	list.push(entry);
	(globalThis as { __laTimeline?: Mark[] }).__laTimeline = list;
	console.info(PREFIX, JSON.stringify(entry));
}

/** Mark a screen once per drawing count: `last` is the screen's ref, so a render does not repeat it. */
export function markScreen(
	last: { current: number | null },
	name: "choice" | "map",
	drawing: number
) {
	if (last.current !== drawing) {
		last.current = drawing;
		mark("screen", { detail: { drawing, name } });
	}
}

export const marks = (): readonly Mark[] => list;

export function clearMarks() {
	list.length = 0;
}

/** Milliseconds between the latest `stall-start` and the `stall-end` after it, for one place and part. */
export function stallLength(place: string, part: number): number | undefined {
	const same = list.filter(
		(m) => m.place === place && m.part === part && m.name.startsWith("stall-")
	);
	const end = same.findLast((m) => m.name === "stall-end");
	const start = same.findLast(
		(m) => m.name === "stall-start" && (!end || m.at <= end.at)
	);
	return start && end ? end.at - start.at : undefined;
}
