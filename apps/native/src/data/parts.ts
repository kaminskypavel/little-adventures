// The rules for playing a place's video parts back to back, with no player in them: the screen
// feeds in what its players report and does what comes back. Part numbers in marks count from 1.
// Every part plays whole, back to back. The narration is one file with a half of words for each
// part; half N plays centred inside part N, and the narration pauses between halves.
// A part may carry its own audio instead (`own`): each audio is a half, centred inside its part
// the same way, and the next audio is a different file rather than a pause.
import { neighbours } from "./map-rules";
import type { NodeId, Part, Place } from "./types";

/** A part counts as ended this close to its duration, so a missed end event never stalls. */
export const END_MARGIN_SEC = 0.1;
/** How long a finished narration waits for a part that is still being made. */
export const GRACE_MS = 3000;
/** How long a finished narration keeps the picture up for a first part that is still being made. */
export const LEAD_HOLD_MS = 12_000;
/** Own audio: how long the picture stands alone before part 1's audio starts over it. */
export const LEAD_OWN_HOLD_MS = 1500;
/** Own audio: how long a first part is waited for once its audio has ended, before the rest play over the picture. */
export const LEAD_AFTER_VOICE_MS = 20_000;

/** The part on screen has reached its end: its end event came, or its time is nearly its length. */
export const reachedEnd = (currentTime: number, duration: number) =>
	duration > 0 && currentTime >= duration - END_MARGIN_SEC;

/**
 * How long a part plays, in seconds: the video's real length (`videoSec`, 0 when not known), cut
 * short by the part's own `durationSec` when that is set and shorter. 0 when neither is known.
 */
export function playableSec(part: Part | undefined, videoSec = 0) {
	const marked = part?.durationSec ?? 0;
	if (videoSec > 0 && marked > 0) {
		return Math.min(videoSec, marked);
	}
	return videoSec > 0 ? videoSec : marked;
}

export type EndCause = "grace" | "last-part" | "narration";
export type Slot = 0 | 1;

/** Longest zoom of the picture while the first part is still being made: scale 1 to this. */
export const LEAD_ZOOM_TO = 1.06;
/** How long the slow zoom runs. */
export const LEAD_ZOOM_MS = 15_000;
/** How long the picture takes to fade once the first part has its first frame. */
export const LEAD_FADE_MS = 400;
/** The hand-over is a dip to night: the picture fades to navy over this many seconds, then back from it. */
export const DIP_HALF_SEC = 0.4;
/** Each half of the dip, in ms. */
export const DIP_HALF_MS = DIP_HALF_SEC * 1000;
/** The whole dip for a person who wants calm: quick, and still centred on the switch. */
export const DIP_REDUCED_MS = 150;

/**
 * The picture and narration lead while the first part is still being made. `since` is the
 * clock (ms) when it began; `ended` is set once a part plays and the video takes over.
 */
export interface Lead {
	ended: boolean;
	/** The wait for part 1 ran out: the words play over the picture. */
	expired: boolean;
	/** The clock (ms) when the picture began to wait for part 1; null before that. */
	holdSince: number | null;
	since: number;
}

export interface PlayState {
	/** Index of the part on screen (the last one shown while holding), -1 before the first. */
	at: number;
	/** Parts whose file would not load, by id, with the url that failed. A fresh url may try again. */
	bad: Record<string, string>;
	/** Index of the part dipping out to night; the navy stays up until the next part shows a frame. */
	dip: number | null;
	/** The place has ended. */
	done: boolean;
	/** Index of the half of the words playing, or the next one to play (own: the part's audio). */
	half: number;
	/** The place has a picture to stand on while the first part is still being made. */
	hasPicture: boolean;
	/** How far the narration has played, in seconds. */
	heard: number;
	/** Set once the narration has started over the picture alone; null when it never did. */
	lead: Lead | null;
	/** How long the narration is, in seconds; 0 until it is known. */
	length: number;
	/** True from the start when there is no narration to wait for. */
	narrationEnded: boolean;
	/** The parts carry their own audio: half N is part N's file, not a stretch of one narration. */
	own: boolean;
	parts: Part[];
	/** `waiting`: the next part is not playable yet. `spent`: no part is left to play. */
	phase: "playing" | "spent" | "waiting";
	/** Which of the two players holds the part on screen; the other buffers the next one. */
	slot: Slot;
	/** The narration should be playing now: a half of the words is being said. */
	speaking: boolean;
	/** Index of the part a stall is waiting on, once its `stall-start` is marked. */
	stall: number | null;
	/** The place has begun: the narration is loaded and the first part is on screen or not coming. */
	started: boolean;
}

export type PlayEvent =
	| { type: "bad"; id: string }
	| { type: "ended" }
	| { type: "grace" }
	| { type: "lead-timeout" }
	| { type: "narration-ended" }
	| {
			/** The narration's time, and how long the whole narration is. */
			length: number;
			sec: number;
			type: "narration-time";
	  }
	| { type: "parts"; parts: Part[] }
	| {
			/** The part on screen is `sec` in; `duration` is how long it plays, 0 when not known. */
			duration: number;
			sec: number;
			type: "part-time";
	  }
	| { type: "started" }
	/** Own audio only: the audio of the half playing has ended. */
	| { type: "voice-ended" };

export interface Step {
	end?: EndCause;
	marks: {
		/** On `lead-hold-end`: how long the picture waited after the narration, in ms. */
		holdMs?: number;
		/** On `picture-lead-end`: how long the picture led alone, in ms. */
		leadMs?: number;
		name:
			| "lead-hold-end"
			| "lead-hold-start"
			| "narration-start"
			| "part-end"
			| "picture-lead-end"
			| "picture-lead-start"
			| "stall-end"
			| "stall-start"
			| "voice-pause"
			| "voice-resume";
		/** Part numbers count from 1; on voice marks, the number of the half. */
		part: number;
		/** On voice marks: where the narration is, in seconds. */
		sec?: number;
	}[];
	state: PlayState;
}

/** The parts carry their own audio (an older adventure has one narration for the place). */
export const ownVoices = (parts: Part[]) =>
	parts.some((part) => part.narration);

/** Own audio: which of the two audio players holds part `index`'s audio: they take turns. */
export const voiceSlot = (index: number): Slot => (index % 2 === 0 ? 0 : 1);

/** Own audio: the url each audio player should hold: the audio playing or next, and the one after. */
export function voiceUrls(s: PlayState): [string | null, string | null] {
	const urls: [string | null, string | null] = [null, null];
	if (s.own) {
		for (const i of [s.half, s.half + 1]) {
			urls[voiceSlot(i)] = s.parts[i]?.narration?.url ?? null;
		}
	}
	return urls;
}

/** Own audio: a part is waiting for its audio, which has not arrived (it may still). */
const awaitsVoice = (part: Part | undefined, s: PlayState) =>
	part !== undefined && !part.narration && !isFailed(s, part);

export const begin = (
	parts: Part[],
	hasNarration: boolean,
	hasPicture = false
): PlayState =>
	skipSilent({
		at: -1,
		bad: {},
		dip: null,
		done: false,
		half: 0,
		hasPicture,
		heard: 0,
		lead: null,
		length: 0,
		narrationEnded: !hasNarration,
		own: ownVoices(parts),
		parts,
		phase: "waiting",
		slot: 1,
		speaking: false,
		stall: null,
		started: false,
	});

/**
 * Own audio: the halves of parts that failed with no audio have nothing to say, so they are
 * passed over; with none left, the narration is over. A part still being made keeps its half: its
 * audio may arrive.
 */
function skipSilent(s: PlayState): PlayState {
	if (!s.own || s.done || s.speaking || s.narrationEnded) {
		return s;
	}
	let { half } = s;
	while (
		half < s.parts.length &&
		!s.parts[half].narration &&
		isFailed(s, s.parts[half])
	) {
		half += 1;
	}
	if (half === s.half) {
		return s;
	}
	return { ...s, half, narrationEnded: half >= s.parts.length };
}

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

/**
 * Where a part's words start in the narration, in seconds. Part 1 starts at 0. A part with no
 * start of its own takes an even share of the narration, which is Infinity until its length is known.
 */
export function wordsStart(s: PlayState, index: number): number {
	if (s.own || index === 0) {
		return 0;
	}
	const from = s.parts[index]?.narrationFromSec;
	if (from !== null && from !== undefined) {
		return from;
	}
	return s.length > 0
		? (s.length * index) / s.parts.length
		: Number.POSITIVE_INFINITY;
}

/** Where a part's half of the words ends: where the next part's words start; the last, the narration's end. */
export const wordsEnd = (s: PlayState, index: number) => {
	if (s.own) {
		return s.parts[index]?.narration?.durationSec ?? 0;
	}
	return index >= s.parts.length - 1 ? s.length : wordsStart(s, index + 1);
};

/**
 * How far into part `index` its half of the words starts: centred, so the silence before and
 * after is equal. A half as long as the part or longer starts with it. The part's length is
 * `playableSec`: the video's `videoSec` (0 when not known), cut short by the part's `durationSec`.
 */
export function voiceOffset(s: PlayState, index: number, videoSec = 0) {
	const partSec = playableSec(s.parts[index], videoSec);
	const half = wordsEnd(s, index) - wordsStart(s, index);
	return Number.isFinite(half) && half >= 0 && partSec > 0
		? Math.max(0, (partSec - half) / 2)
		: 0;
}

/**
 * The part that plays next, if its turn has come: the next one in line, once the half of the
 * words before it has ended. Once the narration is over (or there is none) the parts play on.
 * -1: none yet.
 */
const dueIndex = (s: PlayState) => {
	const next = nextIndex(s);
	return s.narrationEnded || s.half >= next ? next : -1;
};

/** The next part to play, when it can be played now (it may load before its turn). */
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

/** The picture is leading: it holds the frame, with a slow zoom unless the person wants calm. */
export const leadZoom = (s: PlayState, reduceMotion: boolean) =>
	s.lead !== null && !s.lead.ended && !reduceMotion;

/** The picture waits for the first part, which is still being made, with the music alone. */
function startLead(s: PlayState, now: number): Step {
	if (
		s.lead ||
		s.at >= 0 ||
		!s.hasPicture ||
		s.narrationEnded ||
		s.parts[0]?.status !== "making"
	) {
		return unchanged(s);
	}
	return {
		marks: [{ name: "picture-lead-start", part: 1 }],
		state: {
			...s,
			lead: { ended: false, expired: false, holdSince: null, since: now },
		},
	};
}

/**
 * Own audio: a part that has been on screen holds the place up while its audio has not arrived:
 * the next part waits for its half, or no part is left and the place would end. After a grace the
 * half is given up and stays silent.
 */
const waitsOnVoice = (s: PlayState) =>
	s.own &&
	!s.narrationEnded &&
	!s.speaking &&
	s.at >= 0 &&
	s.phase !== "playing" &&
	awaitsVoice(s.parts[s.half], s) &&
	(nextIndex(s) === -1 || s.half < nextIndex(s));

/**
 * The wait that ends in `grace`: the narration is done and the next part is not here (the
 * place ends), or the narration is paused for a part that is not here (it talks on).
 */
export const graceDue = (s: PlayState) =>
	!(s.done || (s.own && leadHolding(s))) &&
	((s.phase === "waiting" &&
		(s.narrationEnded || (s.stall !== null && !s.speaking))) ||
		waitsOnVoice(s));

/**
 * The picture waits for part 1, which is still being made (not failed), before the words
 * start. Not a stall. After `LEAD_HOLD_MS` the words play over the picture.
 */
export const leadHolding = (s: PlayState) =>
	!s.done &&
	s.started &&
	!s.speaking &&
	s.at < 0 &&
	s.lead !== null &&
	!s.lead.ended &&
	!s.lead.expired &&
	s.parts[0]?.status === "making";

/** How long the picture waits (`leadHolding`) before the lead hold runs out. */
export const leadHoldMs = (s: PlayState) => {
	if (!s.own) {
		return LEAD_HOLD_MS;
	}
	return s.half === 0 ? LEAD_OWN_HOLD_MS : LEAD_AFTER_VOICE_MS;
};

const sameParts = (a: Part[], b: Part[]) =>
	a.length === b.length &&
	a.every(
		(part, index) =>
			part.id === b[index].id &&
			part.durationSec === b[index].durationSec &&
			part.narrationFromSec === b[index].narrationFromSec &&
			part.narration?.url === b[index].narration?.url &&
			part.status === b[index].status &&
			part.url === b[index].url
	);

const stallEnd = (s: PlayState): Step["marks"] =>
	s.stall === null ? [] : [{ name: "stall-end", part: s.stall + 1 }];

/** Puts the part at `index` on screen, ending the picture lead and any stall on the way. */
function play(s: PlayState, index: number, now: number): Step {
	const { lead } = s;
	const leadEnd: Step["marks"] =
		lead && !lead.ended
			? [{ leadMs: now - lead.since, name: "picture-lead-end", part: 1 }]
			: [];
	return {
		marks: [...stallEnd(s), ...leadEnd],
		state: {
			...s,
			at: index,
			lead: lead && { ...lead, ended: true },
			phase: "playing",
			slot: other(s.slot),
			stall: null,
		},
	};
}

/**
 * The part on screen is within `DIP_HALF_SEC` of its end and another part follows: the picture
 * dips to night. The navy stays up through the switch and clears once the next part shows a frame.
 */
function onPartTime(
	s: PlayState,
	event: Extract<PlayEvent, { type: "part-time" }>
): Step {
	if (s.phase !== "playing") {
		return unchanged(s);
	}
	if (s.dip !== null && s.dip !== s.at) {
		return { marks: [], state: { ...s, dip: null } };
	}
	if (
		s.dip === null &&
		event.duration > 0 &&
		event.sec >= event.duration - DIP_HALF_SEC &&
		nextIndex(s) !== -1
	) {
		return { marks: [], state: { ...s, dip: s.at } };
	}
	return unchanged(s);
}

/**
 * Moves on as far as it can while no part is running: plays the next part once the half of the
 * words before it has ended, holds the last frame until then (and, marking a stall, while the
 * part is not playable), and ends the place once no part is left and the narration is done.
 * `cause` names what ended the place if this is the end. `force` plays the next part at once,
 * for when the part on screen cannot play.
 */
function settle(
	s: PlayState,
	cause: EndCause,
	now: number,
	force = false
): Step {
	if (s.done || s.phase === "playing") {
		return unchanged(s);
	}
	const next = nextIndex(s);
	if (next === -1) {
		if (s.phase === "spent" && !s.narrationEnded) {
			return unchanged(s);
		}
		const marks = stallEnd(s);
		const state: PlayState = { ...s, dip: null, phase: "spent", stall: null };
		return s.narrationEnded
			? { end: cause, marks, state: { ...state, done: true } }
			: { marks, state };
	}
	const index = force ? next : dueIndex(s);
	if (index === -1) {
		// The half of the words before the next part is still playing: the last frame holds.
		return unchanged(s);
	}
	if (isPlayable(s.parts[index])) {
		return play(s, index, now);
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

/**
 * The half of the words playing is over. When a part is on screen to wait for the next one, the
 * narration pauses; otherwise (words over the picture, or the next part failed) it plays on.
 */
function endHalf(s: PlayState): Step {
	if (
		!s.speaking ||
		s.narrationEnded ||
		s.half >= s.parts.length - 1 ||
		s.heard < wordsStart(s, s.half + 1)
	) {
		return unchanged(s);
	}
	const half = s.half + 1;
	const pauses = s.at >= 0 && !isFailed(s, s.parts[half]);
	return {
		marks: pauses ? [{ name: "voice-pause", part: half, sec: s.heard }] : [],
		state: { ...s, half, speaking: !pauses },
	};
}

/** Own audio: moves past the half in turn (its audio is over, or it never came). */
const giveUp = (s: PlayState): PlayState => ({
	...s,
	half: s.half + 1,
	narrationEnded: s.half + 1 >= s.parts.length,
});

/**
 * Own audio: the audio of the half playing has ended. The next audio is due at once over the
 * picture, or centred in its part otherwise; with none left, the narration is over.
 */
function endVoice(s: PlayState, now: number): Step {
	if (!(s.own && s.speaking)) {
		return unchanged(s);
	}
	const base = giveUp({ ...s, speaking: false });
	// Part 1's audio is over and part 1 is still being made: the picture waits for it again
	// before the next audio plays.
	const waits =
		s.half === 0 &&
		s.at < 0 &&
		s.lead &&
		!s.lead.ended &&
		s.parts[0]?.status === "making";
	return settle(
		waits && s.lead ? { ...base, lead: { ...s.lead, expired: false } } : base,
		"narration",
		now
	);
}

/** The narration's time: a half of the words may end, which lets the next part start. */
function onNarrationTime(
	s: PlayState,
	event: Extract<PlayEvent, { type: "narration-time" }>,
	now: number
): Step {
	if (s.own) {
		return unchanged(s);
	}
	const over = endHalf({ ...s, heard: event.sec, length: event.length });
	if (over.state.phase === "playing") {
		return over;
	}
	const next = settle(over.state, "narration", now);
	return { ...next, marks: [...over.marks, ...next.marks] };
}

function ended(s: PlayState, now: number): Step {
	if (s.phase !== "playing") {
		return unchanged(s);
	}
	// An end with no dip yet (a coarse tick) still goes through the navy.
	const next = settle(
		{ ...s, dip: s.dip ?? s.at, phase: "waiting" },
		"last-part",
		now
	);
	return {
		...next,
		marks: [{ name: "part-end", part: s.at + 1 }, ...next.marks],
	};
}

function bad(s: PlayState, id: string, now: number): Step {
	const part = s.parts.find((p) => p.id === id);
	if (!part || part.url === null || s.bad[id] === part.url) {
		return unchanged(s);
	}
	const marked = { ...s, bad: { ...s.bad, [id]: part.url } };
	const onScreen = s.phase === "playing" && s.parts[s.at]?.id === id;
	return settle(
		onScreen ? { ...marked, phase: "waiting" } : marked,
		"narration",
		now,
		onScreen
	);
}

/** The half of the words about to play starts. */
function startHalf(s: PlayState): Step {
	return {
		marks: [
			{
				name: s.half === 0 || s.own ? "narration-start" : "voice-resume",
				part: s.half + 1,
				sec: wordsStart(s, s.half),
			},
		],
		state: { ...s, speaking: true },
	};
}

function grace(s: PlayState, now: number): Step {
	if (!graceDue(s)) {
		return unchanged(s);
	}
	if (waitsOnVoice(s)) {
		return settle(giveUp(s), "grace", now);
	}
	if (!s.narrationEnded) {
		if (s.own && awaitsVoice(s.parts[s.half], s)) {
			return unchanged(s);
		}
		// The narration waited for a part that did not come: it talks on over the held frame.
		return startHalf(s);
	}
	return {
		end: "grace",
		marks: stallEnd(s),
		state: { ...s, done: true, stall: null },
	};
}

/** The lead hold runs out: the words play over the picture. */
function leadTimeout(s: PlayState): Step {
	if (!(leadHolding(s) && s.lead)) {
		return unchanged(s);
	}
	return { marks: [], state: { ...s, lead: { ...s.lead, expired: true } } };
}

/**
 * Whether the half of the words about to play should start now. A half starts `voiceOffset` into
 * its part (`sec`, in seconds, is where the part on screen is; -1 when not known). Half 1 starts
 * over the picture when part 1 will not come or its wait ran out. A part that failed has no
 * place to centre in: its half plays at once.
 */
function halfDue(s: PlayState, sec: number, duration: number) {
	const owner = s.parts[s.half];
	if (
		!owner ||
		s.done ||
		s.speaking ||
		s.narrationEnded ||
		!s.started ||
		!Number.isFinite(wordsStart(s, s.half))
	) {
		return false;
	}
	if (s.own && !owner.narration) {
		return false;
	}
	if (isFailed(s, owner) || s.at > s.half) {
		return true;
	}
	if (s.at === s.half) {
		return s.phase !== "playing" || sec >= voiceOffset(s, s.half, duration);
	}
	if (s.own) {
		// Nothing on screen and no part to play next: the audios play over the picture.
		return s.at < 0 && upcoming(s) === null && !leadHolding(s);
	}
	return s.half === 0 && s.at < 0 && !isPlayable(owner) && !leadHolding(s);
}

/** Starts the half of the words that is due, after any event. */
function withVoice(next: Step, event: PlayEvent): Step {
	const timed = event.type === "part-time";
	if (
		!halfDue(next.state, timed ? event.sec : -1, timed ? event.duration : 0)
	) {
		return next;
	}
	const start = startHalf(next.state);
	return {
		...next,
		marks: [...next.marks, ...start.marks],
		state: start.state,
	};
}

/** Adds the marks for a lead hold starting or ending around one step. */
function holdMarks(before: PlayState, next: Step, now: number): Step {
	const was = leadHolding(before);
	const is = leadHolding(next.state);
	const since = before.lead?.holdSince ?? null;
	if (was && !is && since !== null) {
		const holdMs = now - since;
		return {
			...next,
			marks: [{ holdMs, name: "lead-hold-end", part: 1 }, ...next.marks],
		};
	}
	if (!was && is && next.state.lead) {
		return {
			...next,
			marks: [...next.marks, { name: "lead-hold-start", part: 1 }],
			state: {
				...next.state,
				lead: { ...next.state.lead, holdSince: now },
			},
		};
	}
	return next;
}

/**
 * One event in, the next state out, with the marks to record and the end if the place is over.
 * `now` is the clock in ms, for the length of a picture lead.
 */
export function step(
	s: PlayState,
	event: PlayEvent,
	now: number = Date.now()
): Step {
	return holdMarks(s, withVoice(reap(advance(s, event, now), now), event), now);
}

/** Own audio: after any event, passes over the halves with nothing to say, which may end the place. */
function reap(next: Step, now: number): Step {
	const alive = skipSilent(next.state);
	if (alive === next.state) {
		return next;
	}
	const settled = settle(alive, "narration", now);
	return {
		end: settled.end ?? next.end,
		marks: [...next.marks, ...settled.marks],
		state: settled.state,
	};
}

function advance(s: PlayState, event: PlayEvent, now: number): Step {
	if (s.done) {
		return unchanged(s);
	}
	switch (event.type) {
		case "bad":
			return bad(s, event.id, now);
		case "ended":
			return ended(s, now);
		case "grace":
			return grace(s, now);
		case "lead-timeout":
			return leadTimeout(s);
		case "narration-ended":
			return s.narrationEnded
				? unchanged(s)
				: settle(
						{ ...s, narrationEnded: true, speaking: false },
						"narration",
						now
					);
		case "narration-time":
			return onNarrationTime(s, event, now);
		case "parts":
			return settle(
				sameParts(s.parts, event.parts) ? s : { ...s, parts: event.parts },
				"narration",
				now
			);
		case "part-time":
			return onPartTime(s, event);
		case "started":
			return s.started ? unchanged(s) : startLead({ ...s, started: true }, now);
		case "voice-ended":
			return endVoice(s, now);
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
