// The rules for playing a place's video parts back to back, with no player in them: the screen
// feeds in what its players report and does what comes back. Part numbers in marks count from 1.
import { neighbours } from "./map-rules";
import type { NodeId, Part, Place } from "./types";

/** A part counts as ended this close to its duration, so a missed end event never stalls. */
export const END_MARGIN_SEC = 0.1;
/** How long a finished narration waits for a part that is still being made. */
export const GRACE_MS = 3000;

/** The part on screen has reached its end: its end event came, or its time is nearly its length. */
export const reachedEnd = (currentTime: number, duration: number) =>
	duration > 0 && currentTime >= duration - END_MARGIN_SEC;

export type EndCause = "grace" | "last-part" | "narration";
export type Slot = 0 | 1;

export interface PlayState {
	/** Index of the part on screen (the last one shown while holding), -1 before the first. */
	at: number;
	/** Parts whose file would not load, by id, with the url that failed. A fresh url may try again. */
	bad: Record<string, string>;
	/** The place has ended. */
	done: boolean;
	/** True from the start when there is no narration to wait for. */
	narrationEnded: boolean;
	parts: Part[];
	/** `waiting`: the next part is not playable yet. `spent`: no part is left to play. */
	phase: "playing" | "spent" | "waiting";
	/** Which of the two players holds the part on screen; the other buffers the next one. */
	slot: Slot;
	/** Index of the part a stall is waiting on, once its `stall-start` is marked. */
	stall: number | null;
}

export type PlayEvent =
	| { type: "bad"; id: string }
	| { type: "ended" }
	| { type: "grace" }
	| { type: "narration-ended" }
	| { type: "parts"; parts: Part[] };

export interface Step {
	end?: EndCause;
	marks: { name: "part-end" | "stall-end" | "stall-start"; part: number }[];
	state: PlayState;
}

export const begin = (parts: Part[], hasNarration: boolean): PlayState => ({
	at: -1,
	bad: {},
	done: false,
	narrationEnded: !hasNarration,
	parts,
	phase: "waiting",
	slot: 1,
	stall: null,
});

const unchanged = (state: PlayState): Step => ({ marks: [], state });
const other = (slot: Slot): Slot => (slot === 0 ? 1 : 0);

export const isPlayable = (part: Part) =>
	part.status === "playable" && part.url !== null;

const isFailed = (s: PlayState, part: Part) =>
	part.status === "failed" ||
	(part.url !== null && s.bad[part.id] === part.url);

/** Index of the next part to play after the one on screen; failed parts are skipped. -1: none. */
const nextIndex = (s: PlayState) =>
	s.parts.findIndex((part, index) => index > s.at && !isFailed(s, part));

/** The next part to play, when it can be played now. */
export function upcoming(s: PlayState): Part | null {
	const part = s.parts[nextIndex(s)];
	return part && isPlayable(part) ? part : null;
}

/** The part each player should hold: the one on screen, and the next one as soon as it is playable. */
export function slotParts(s: PlayState): [Part | null, Part | null] {
	const held: [Part | null, Part | null] = [null, null];
	const here = s.parts[s.at];
	if (here && !isFailed(s, here)) {
		held[s.slot] = here;
	}
	held[other(s.slot)] = upcoming(s);
	return held;
}

/** Whether a place has a part that is playing, playable or still coming. */
export const hasParts = (parts: Part[]) =>
	parts.some((part) => part.status !== "failed");

/** The narration is done and the next part is still not here: the wait that ends in `grace`. */
export const graceDue = (s: PlayState) =>
	!s.done && s.phase === "waiting" && s.narrationEnded;

const sameParts = (a: Part[], b: Part[]) =>
	a.length === b.length &&
	a.every(
		(part, index) =>
			part.id === b[index].id &&
			part.status === b[index].status &&
			part.url === b[index].url
	);

const stallEnd = (s: PlayState): Step["marks"] =>
	s.stall === null ? [] : [{ name: "stall-end", part: s.stall + 1 }];

/**
 * Moves on as far as it can while no part is running: plays the next playable part, holds the
 * last frame (marking a stall) while the next is not playable, and ends the place once no part is
 * left and the narration is done. `cause` names what ended the place if this is the end.
 */
function settle(s: PlayState, cause: EndCause): Step {
	if (s.done || s.phase === "playing") {
		return unchanged(s);
	}
	const index = nextIndex(s);
	if (index === -1) {
		if (s.phase === "spent" && !s.narrationEnded) {
			return unchanged(s);
		}
		const marks = stallEnd(s);
		const state: PlayState = { ...s, phase: "spent", stall: null };
		return s.narrationEnded
			? { end: cause, marks, state: { ...state, done: true } }
			: { marks, state };
	}
	if (isPlayable(s.parts[index])) {
		return {
			marks: stallEnd(s),
			state: {
				...s,
				at: index,
				phase: "playing",
				slot: other(s.slot),
				stall: null,
			},
		};
	}
	// Before the first part there is nothing to hold, so that wait is not a stall.
	if (s.at < 0 || s.stall !== null) {
		return unchanged(s);
	}
	return {
		marks: [{ name: "stall-start", part: index + 1 }],
		state: { ...s, stall: index },
	};
}

function ended(s: PlayState): Step {
	if (s.phase !== "playing") {
		return unchanged(s);
	}
	const next = settle({ ...s, phase: "waiting" }, "last-part");
	return {
		...next,
		marks: [{ name: "part-end", part: s.at + 1 }, ...next.marks],
	};
}

function bad(s: PlayState, id: string): Step {
	const part = s.parts.find((p) => p.id === id);
	if (!part || part.url === null || s.bad[id] === part.url) {
		return unchanged(s);
	}
	const marked = { ...s, bad: { ...s.bad, [id]: part.url } };
	const onScreen = s.phase === "playing" && s.parts[s.at]?.id === id;
	return settle(
		onScreen ? { ...marked, phase: "waiting" } : marked,
		"narration"
	);
}

function grace(s: PlayState): Step {
	if (!graceDue(s)) {
		return unchanged(s);
	}
	return {
		end: "grace",
		marks: stallEnd(s),
		state: { ...s, done: true, stall: null },
	};
}

/** One event in, the next state out, with the marks to record and the end if the place is over. */
export function step(s: PlayState, event: PlayEvent): Step {
	if (s.done) {
		return unchanged(s);
	}
	switch (event.type) {
		case "bad":
			return bad(s, event.id);
		case "ended":
			return ended(s);
		case "grace":
			return grace(s);
		case "narration-ended":
			return s.narrationEnded
				? unchanged(s)
				: settle({ ...s, narrationEnded: true }, "narration");
		case "parts":
			return settle(
				sameParts(s.parts, event.parts) ? s : { ...s, parts: event.parts },
				"narration"
			);
		default:
			return unchanged(s);
	}
}

/** The urls of each neighbour's first playable part, for warming when a place starts. */
export function neighbourUrls(
	places: Record<NodeId, Pick<Place, "parts">>,
	from: NodeId
): string[] {
	return neighbours(from).flatMap((node) => {
		const url = places[node].parts.find(isPlayable)?.url;
		return url ? [url] : [];
	});
}
