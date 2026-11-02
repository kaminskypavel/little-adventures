import { describe, expect, test } from "bun:test";
import {
	begin,
	END_MARGIN_SEC,
	type EndCause,
	GRACE_MS,
	graceDue,
	hasParts,
	LEAD_ZOOM_TO,
	leadHolding,
	leadZoom,
	neighbourUrls,
	type PlayEvent,
	type PlayState,
	reachedEnd,
	slotParts,
	step,
	upcoming,
	voiceOffset,
	wordsEnd,
	wordsStart,
} from "./parts";
import type { Part } from "./types";

const playable = (id: string): Part => ({
	id,
	status: "playable",
	url: `https://files.test/${id}`,
});
const making = (id: string): Part => ({ id, status: "making", url: null });
const failed = (id: string): Part => ({ id, status: "failed", url: null });
/** A part of `durationSec` whose words start at `from` seconds of the narration. */
const timed = (id: string, durationSec: number, from: number | null): Part => ({
	...playable(id),
	durationSec,
	narrationFromSec: from,
});

/** Feeds events in order; collects the marks (as "name part") and the cause the place ended with. */
function drive(state: PlayState, ...events: PlayEvent[]) {
	const marks: string[] = [];
	let end: EndCause | undefined;
	let now = state;
	for (const event of events) {
		const next = step(now, event);
		now = next.state;
		marks.push(...next.marks.map((m) => `${m.name} ${m.part}`));
		end = next.end ?? end;
	}
	return { end, marks, state: now };
}

const parts = (...list: Part[]): PlayEvent => ({ parts: list, type: "parts" });
const ended: PlayEvent = { type: "ended" };
const narrationEnded: PlayEvent = { type: "narration-ended" };
const grace: PlayEvent = { type: "grace" };
const started: PlayEvent = { type: "started" };
const leadTimeout: PlayEvent = { type: "lead-timeout" };
/** The narration reaches `sec` of a 16 s narration. */
const at = (sec: number): PlayEvent => ({
	length: 16,
	sec,
	type: "narration-time",
});
/** The part on screen is `sec` in; its video is 15 s long. */
const tick = (sec: number, duration = 15): PlayEvent => ({
	duration,
	sec,
	type: "part-time",
});

/** Two parts of 15 s; part 2's words start at 8 s of a 16 s narration, so each half is 8 s. */
const two = [timed("a", 15, 0), timed("b", 15, 8)];
/** Half 1 is said: the place has begun, half 1 starts centred in part 1, then pauses. */
const firstHalf = [started, at(0), tick(3.5), at(8)];

describe("each half of the words is centred inside its part", () => {
	test("a half shorter than its part starts (part - half) / 2 into it", () => {
		const { state } = drive(begin(two, true), parts(...two), started, at(0));
		expect(voiceOffset(state, 0, 15)).toBe(3.5);
		expect(voiceOffset(state, 1, 15)).toBe(3.5);
		const early = drive(state, tick(3.4));
		expect(early.state.speaking).toBe(false);
		expect(early.marks).toEqual([]);
		const on = step(early.state, tick(3.5));
		expect(on.state.speaking).toBe(true);
		expect(on.marks).toEqual([{ name: "narration-start", part: 1, sec: 0 }]);
	});

	test("the real length of the video wins over the length the part was made with", () => {
		const { state } = drive(begin(two, true), parts(...two), started, at(0));
		expect(voiceOffset(state, 0, 12)).toBe(2);
		// No real length yet: the part's own length.
		expect(voiceOffset(state, 0, 0)).toBe(3.5);
		// Neither is known: the half starts with the part.
		const bare = [playable("a"), { ...playable("b"), narrationFromSec: 8 }];
		expect(voiceOffset({ ...state, parts: bare }, 0, 0)).toBe(0);
	});

	test("the narration pauses after half 1 and half 2 is centred in part 2", () => {
		const a = drive(begin(two, true), parts(...two), ...firstHalf);
		expect(a.marks).toEqual(["narration-start 1", "voice-pause 1"]);
		expect(a.state.speaking).toBe(false);
		expect(a.state.half).toBe(1);
		// Part 2 waits for part 1 to end whole.
		expect(a.state.at).toBe(0);
		const swapped = drive(a.state, ended);
		expect(swapped.marks).toEqual(["part-end 1"]);
		expect(swapped.state.at).toBe(1);
		expect(drive(swapped.state, tick(3.4)).state.speaking).toBe(false);
		const resumed = step(swapped.state, tick(3.5));
		expect(resumed.state.speaking).toBe(true);
		expect(resumed.marks).toEqual([{ name: "voice-resume", part: 2, sec: 8 }]);
	});

	test("a half longer than its part starts with it and the part holds its last frame", () => {
		const long = [timed("a", 5, 0), timed("b", 15, 8)];
		const state = drive(begin(long, true), parts(...long), started, at(0));
		expect(voiceOffset(state.state, 0, 5)).toBe(0);
		const go = drive(state.state, tick(0.1, 5));
		expect(go.marks).toEqual(["narration-start 1"]);
		// Part 1 ends at 5 s, the words go on: the last frame holds, part 2 waits.
		const held = drive(go.state, tick(4.9, 5), ended);
		expect(held.marks).toEqual(["part-end 1"]);
		expect(held.state.at).toBe(0);
		expect(held.state.phase).toBe("waiting");
		expect(held.state.stall).toBe(null);
		expect(graceDue(held.state)).toBe(false);
		expect(drive(held.state, at(7.9)).state.at).toBe(0);
		// The half ends: the narration pauses and part 2 starts at once.
		const next = drive(held.state, at(8));
		expect(next.marks).toEqual(["voice-pause 1"]);
		expect(next.state.at).toBe(1);
		expect(next.state.phase).toBe("playing");
	});

	test("a part with no start of its own takes an even half of the narration", () => {
		const even = [timed("a", 15, null), timed("b", 15, null)];
		const state = drive(begin(even, true), parts(...even), started, at(0));
		expect(wordsStart(state.state, 1)).toBe(8);
		expect(wordsEnd(state.state, 0)).toBe(8);
		expect(wordsEnd(state.state, 1)).toBe(16);
		expect(voiceOffset(state.state, 0, 15)).toBe(3.5);
		expect(drive(state.state, tick(3.4)).state.speaking).toBe(false);
		expect(drive(state.state, tick(3.5)).state.speaking).toBe(true);
		// Three parts: 16 s over 3 is 5.33 s each.
		const three = [playable("a"), playable("b"), playable("c")];
		const s3 = begin(three, true);
		expect(wordsStart({ ...s3, length: 16 }, 0)).toBe(0);
		expect(Math.round(wordsStart({ ...s3, length: 16 }, 2) * 1000)).toBe(
			10_667
		);
		// A narration whose length is not known yet has no later half to start.
		expect(wordsStart(s3, 1)).toBe(Number.POSITIVE_INFINITY);
	});

	test("the place ends after the last part and the last half, whichever is later", () => {
		const second = drive(
			begin(two, true),
			parts(...two),
			...firstHalf,
			ended,
			tick(3.5)
		);
		expect(second.state.speaking).toBe(true);
		// The last part ends first: the last frame holds until the narration is over.
		const partFirst = drive(second.state, ended);
		expect(partFirst.end).toBe(undefined);
		expect(partFirst.state.phase).toBe("spent");
		expect(drive(partFirst.state, narrationEnded).end).toBe("narration");
		// The last half ends first.
		const halfFirst = drive(second.state, narrationEnded);
		expect(halfFirst.end).toBe(undefined);
		expect(drive(halfFirst.state, ended).end).toBe("last-part");
	});

	test("the place does not end while either is still going", () => {
		const midway = drive(
			begin(two, true),
			parts(...two),
			...firstHalf,
			ended,
			narrationEnded
		);
		expect(midway.end).toBe(undefined);
		expect(midway.state.at).toBe(1);
		expect(midway.state.phase).toBe("playing");
	});

	test("a part's end after the swap does nothing more", () => {
		const a = drive(
			begin(two, true),
			parts(...two),
			...firstHalf,
			ended,
			ended
		);
		expect(a.marks).toEqual([
			"narration-start 1",
			"voice-pause 1",
			"part-end 1",
			"part-end 2",
			// Part 2 ended before its half was due: the half starts then.
			"voice-resume 2",
		]);
		expect(a.end).toBe(undefined);
	});

	test("a part that ends before its half was due still gets its half", () => {
		const a = drive(begin(two, true), parts(...two), started, at(0), ended);
		expect(a.marks).toEqual(["part-end 1", "narration-start 1"]);
		expect(a.state.speaking).toBe(true);
		expect(a.state.at).toBe(0);
	});

	test("without narration the last part ends the place", () => {
		const a = drive(begin(two, false), parts(...two), ended, ended);
		expect(a.end).toBe("last-part");
	});

	test("the two players take turns", () => {
		const start = drive(begin(two, true), parts(...two));
		expect(start.state.slot).toBe(0);
		expect(slotParts(start.state)).toEqual([two[0], two[1]]);
		const swapped = drive(start.state, ...firstHalf, ended);
		expect(swapped.state.slot).toBe(1);
		expect(slotParts(swapped.state)).toEqual([null, two[1]]);
	});
});

describe("the next part is not playable yet", () => {
	const first = [timed("a", 15, 0), { ...making("b"), narrationFromSec: 8 }];

	test("hold the last frame, mark the stall, and end it when the part is playable", () => {
		const early = drive(
			begin(first, true),
			parts(...first),
			...firstHalf,
			ended
		);
		expect(early.marks).toEqual([
			"narration-start 1",
			"voice-pause 1",
			"part-end 1",
			"stall-start 2",
		]);
		expect(early.state.at).toBe(0);
		expect(early.state.phase).toBe("waiting");
		// The first part is still the one held, and the next has nothing to load yet.
		expect(slotParts(early.state)).toEqual([first[0], null]);

		const resumed = drive(early.state, parts(first[0], timed("b", 15, 8)));
		expect(resumed.marks).toEqual(["stall-end 2"]);
		expect(resumed.state.at).toBe(1);
		expect(resumed.state.phase).toBe("playing");
	});

	test("the words of the half before it are still playing: no stall yet", () => {
		const early = drive(
			begin(first, true),
			parts(...first),
			started,
			at(0),
			ended
		);
		expect(early.marks).toEqual(["part-end 1", "narration-start 1"]);
		expect(early.state.stall).toBe(null);
	});

	test("a poll that changes nothing leaves the stall alone", () => {
		const held = drive(
			begin(first, true),
			parts(...first),
			...firstHalf,
			ended
		);
		const again = drive(held.state, parts(...first));
		expect(again.marks).toEqual([]);
		expect(again.state).toBe(held.state);
	});

	test("the narration paused for a part that never comes talks on after a grace", () => {
		const held = drive(
			begin(first, true),
			parts(...first),
			...firstHalf,
			ended
		);
		expect(graceDue(held.state)).toBe(true);
		const talk = drive(held.state, grace);
		expect(talk.end).toBe(undefined);
		expect(talk.marks).toEqual(["voice-resume 2"]);
		expect(talk.state.speaking).toBe(true);
		expect(graceDue(talk.state)).toBe(false);
	});

	test("narration done and the part still making: the wait is a stall, then the place ends with grace", () => {
		const waiting = drive(
			begin(first, true),
			parts(...first),
			...firstHalf,
			narrationEnded,
			ended
		);
		expect(waiting.marks.slice(-2)).toEqual(["part-end 1", "stall-start 2"]);
		expect(waiting.end).toBe(undefined);
		expect(graceDue(waiting.state)).toBe(true);

		const over = drive(waiting.state, grace);
		expect(over.marks).toEqual(["stall-end 2"]);
		expect(over.end).toBe("grace");
	});

	test("a part that turns playable before the wait runs out plays, not graces", () => {
		const waiting = drive(
			begin(first, true),
			parts(...first),
			...firstHalf,
			narrationEnded,
			ended,
			parts(first[0], timed("b", 15, 8))
		);
		expect(waiting.state.at).toBe(1);
		expect(waiting.state.phase).toBe("playing");
		// A late grace event has nothing to end.
		expect(drive(waiting.state, grace).end).toBe(undefined);
		expect(GRACE_MS).toBe(3000);
	});

	test("before the first part there is nothing to hold, so no stall", () => {
		const none = [making("a"), making("b")];
		const waiting = drive(begin(none, true), parts(...none));
		expect(waiting.marks).toEqual([]);
		expect(waiting.state.at).toBe(-1);
		const ready = drive(waiting.state, parts(playable("a"), making("b")));
		expect(ready.state.at).toBe(0);
	});
});

describe("a failed part", () => {
	test("part 2 failed: the narration plays on past half 1, and the place ends with it", () => {
		const list = [timed("a", 15, 0), failed("b")];
		const played = drive(
			begin(list, true),
			parts(...list),
			started,
			at(0),
			tick(3.5),
			at(8),
			ended
		);
		// Nothing to wait for, so no pause between the halves.
		expect(played.marks).toEqual(["narration-start 1", "part-end 1"]);
		expect(played.state.speaking).toBe(true);
		expect(played.state.phase).toBe("spent");
		expect(played.end).toBe(undefined);
		const over = drive(played.state, narrationEnded);
		expect(over.end).toBe("narration");
	});

	test("part 2 failed and the narration already done: the place ends as part 1 ends", () => {
		const list = [timed("a", 15, 0), failed("b")];
		const over = drive(
			begin(list, true),
			parts(...list),
			started,
			narrationEnded,
			ended
		);
		expect(over.end).toBe("last-part");
		expect(over.marks).toEqual(["part-end 1"]);
	});

	test("a failed middle part is skipped for the next playable one", () => {
		const list = [timed("a", 15, 0), failed("b"), timed("c", 15, 11)];
		const next = drive(
			begin(list, true),
			parts(...list),
			started,
			at(0),
			tick(5),
			// Half 2 (the failed part's) plays on, half 3 is the last.
			at(5.4),
			at(11),
			ended
		);
		expect(next.state.at).toBe(2);
		expect(next.marks).toEqual([
			"narration-start 1",
			"voice-pause 2",
			"part-end 1",
		]);
	});

	test("a part being waited on that then fails lets the narration end the place", () => {
		const list = [timed("a", 15, 0), { ...making("b"), narrationFromSec: 8 }];
		const held = drive(begin(list, true), parts(...list), ...firstHalf, ended);
		const failedNow = drive(held.state, parts(list[0], failed("b")));
		expect(failedNow.marks).toEqual(["stall-end 2", "voice-resume 2"]);
		expect(failedNow.state.phase).toBe("spent");
		expect(failedNow.state.speaking).toBe(true);
		expect(drive(failedNow.state, narrationEnded).end).toBe("narration");
	});

	test("a part whose file will not load is skipped; a fresh url may try again", () => {
		const start = drive(begin(two, true), parts(...two));
		// The next part's file fails while part 1 plays.
		const broken = drive(start.state, { id: "b", type: "bad" });
		expect(upcoming(broken.state)).toBe(null);
		expect(drive(broken.state, ended).state.phase).toBe("spent");
		// A read brings the part again under another url.
		const fresh = drive(
			broken.state,
			parts(two[0], { ...two[1], url: "https://files.test/b2" })
		);
		expect(upcoming(fresh.state)?.url).toBe("https://files.test/b2");
	});

	test("the part on screen failing to load moves on", () => {
		const start = drive(begin(two, true), parts(...two), ...firstHalf);
		const next = drive(start.state, { id: "a", type: "bad" });
		expect(next.state.at).toBe(1);
		expect(next.marks).toEqual([]);
	});
});

describe("the narration is longer than the parts", () => {
	test("the last frame holds and nothing stalls", () => {
		const held = drive(
			begin(two, true),
			parts(...two),
			...firstHalf,
			ended,
			tick(3.5),
			ended
		);
		expect(held.state.phase).toBe("spent");
		expect(held.state.stall).toBe(null);
		expect(held.end).toBe(undefined);
		expect(graceDue(held.state)).toBe(false);
		// A poll while holding changes nothing.
		expect(drive(held.state, parts(...two)).state).toBe(held.state);
		expect(drive(held.state, narrationEnded).end).toBe("narration");
	});
});

describe("a place that is not made in parts", () => {
	test("a recorded node (one part from its clip) plays as one part, as before", () => {
		const clip = [playable("p1-clip")];
		const a = drive(begin(clip, true), parts(...clip), ended);
		expect(a.marks).toEqual(["part-end 1"]);
		expect(a.state.phase).toBe("spent");
		expect(drive(a.state, narrationEnded).end).toBe("narration");
		// With the clip last, it is the last part that ends the place.
		expect(
			drive(begin(clip, true), parts(...clip), narrationEnded, ended).end
		).toBe("last-part");
	});

	test("one part holds the whole narration, centred in the clip", () => {
		const clip = [timed("p1-clip", 20, 0)];
		const state = drive(begin(clip, true), parts(...clip), started, at(0));
		expect(wordsEnd(state.state, 0)).toBe(16);
		expect(voiceOffset(state.state, 0, 20)).toBe(2);
		expect(drive(state.state, tick(2, 20)).state.speaking).toBe(true);
		// The last half never pauses: the narration ends it.
		const last = drive(state.state, tick(2, 20), at(16));
		expect(last.state.speaking).toBe(true);
	});

	test("no parts and no clip: the picture shows for the narration's length", () => {
		expect(hasParts([])).toBe(false);
		const a = drive(begin([], true), parts());
		expect(a.state.phase).toBe("spent");
		expect(a.end).toBe(undefined);
		expect(drive(a.state, narrationEnded).end).toBe("narration");
	});

	test("only failed parts count as no parts", () => {
		expect(hasParts([failed("a")])).toBe(false);
		expect(hasParts([failed("a"), making("b")])).toBe(true);
	});
});

describe("the swap on time", () => {
	test("a part counts as ended 0.1 s before its length", () => {
		expect(END_MARGIN_SEC).toBe(0.1);
		expect(reachedEnd(9.89, 10)).toBe(false);
		expect(reachedEnd(9.9, 10)).toBe(true);
		expect(reachedEnd(10, 10)).toBe(true);
		// A length not known yet never counts as the end.
		expect(reachedEnd(0, 0)).toBe(false);
	});

	test("an end event while no part is running does nothing", () => {
		const list = [timed("a", 15, 0), making("b")];
		const held = drive(begin(list, true), parts(...list), ended);
		const late = drive(held.state, ended);
		expect(late.state).toBe(held.state);
		expect(late.marks).toEqual([]);
	});
});

describe("warming neighbours", () => {
	const place = (...list: Part[]) => ({ parts: list });
	const places = {
		intro: place(),
		outro: place(),
		p1: place(playable("p1-a"), playable("p1-b")),
		p1a: place(),
		p2: place(making("p2-a"), playable("p2-b")),
		p2a: place(),
	};

	test("each neighbour's first playable part", () => {
		expect(neighbourUrls(places, "intro")).toEqual([
			"https://files.test/p1-a",
			"https://files.test/p2-b",
		]);
	});

	test("a neighbour with nothing playable adds nothing, and goodnight has none", () => {
		expect(neighbourUrls(places, "p1")).toEqual(["https://files.test/p2-b"]);
		expect(neighbourUrls(places, "outro")).toEqual([]);
	});
});

describe("the picture leads while part 1 is still being made", () => {
	const first = [making("a"), making("b")];
	const led = () => step(begin(first, true, true), started, 1000);

	test("the picture waits with the music alone: no words, no part", () => {
		const hold = led();
		expect(hold.marks).toEqual([
			{ name: "picture-lead-start", part: 1 },
			{ name: "lead-hold-start", part: 1 },
		]);
		expect(hold.state.lead).toEqual({
			ended: false,
			expired: false,
			holdSince: 1000,
			since: 1000,
		});
		expect(hold.state.speaking).toBe(false);
		expect(leadHolding(hold.state)).toBe(true);
		expect(leadZoom(hold.state, false)).toBe(true);
		// Started again: nothing more.
		expect(step(hold.state, started, 2000).marks).toEqual([]);
		// Words never start while the picture waits.
		expect(step(hold.state, at(0), 3000).state.speaking).toBe(false);
	});

	test("no picture, no narration or a playable first part: no lead", () => {
		expect(step(begin(first, true), started, 0).state.lead).toBe(null);
		expect(step(begin(first, false, true), started, 0).state.lead).toBe(null);
		const ready = [playable("a"), making("b")];
		expect(step(begin(ready, true, true), started, 0).state.lead).toBe(null);
	});

	test("no picture and part 1 still being made: the words start over the empty frame", () => {
		const bare = step(begin(first, true), started, 0);
		expect(bare.state.speaking).toBe(true);
		expect(bare.marks).toEqual([{ name: "narration-start", part: 1, sec: 0 }]);
	});

	test("part 1 landing late ends the wait, then its half is centred", () => {
		const hold = led().state;
		const one = step(hold, parts(timed("a", 15, 0), making("b")), 8400);
		expect(one.marks).toEqual([
			{ holdMs: 7400, name: "lead-hold-end", part: 1 },
			{ leadMs: 7400, name: "picture-lead-end", part: 1 },
		]);
		expect(one.state.at).toBe(0);
		expect(one.state.speaking).toBe(false);
		expect(leadZoom(one.state, false)).toBe(false);
		const withLength = step(one.state, at(0), 8500).state;
		expect(step(withLength, tick(3.4), 11_900).state.speaking).toBe(false);
		const on = step(withLength, tick(3.5), 12_000);
		expect(on.state.speaking).toBe(true);
		expect(on.marks).toEqual([{ name: "narration-start", part: 1, sec: 0 }]);
	});

	test("part 1 failing puts the words over the picture at once", () => {
		const lost = step(led().state, parts(failed("a"), failed("b")), 1100);
		expect(lost.marks.map((m) => m.name)).toEqual([
			"lead-hold-end",
			"narration-start",
		]);
		expect(lost.state.speaking).toBe(true);
		expect(lost.state.lead?.ended).toBe(false);
		// No part is on screen to wait for, so the words play through both halves.
		const through = drive(lost.state, at(8));
		expect(through.marks).toEqual([]);
		expect(through.state.speaking).toBe(true);
		expect(through.state.half).toBe(1);
		const done = step(through.state, narrationEnded, 5000);
		expect(done.end).toBe("narration");
	});

	test("the wait for part 1 runs out after the lead hold: the words play over the picture", () => {
		const out = step(led().state, leadTimeout, 13_000);
		expect(out.marks).toEqual([
			{ holdMs: 12_000, name: "lead-hold-end", part: 1 },
			{ name: "narration-start", part: 1, sec: 0 },
		]);
		expect(out.state.speaking).toBe(true);
		expect(leadHolding(out.state)).toBe(false);
		// A timeout after the wait is over does nothing.
		expect(step(out.state, leadTimeout, 14_000).state).toBe(out.state);
		// Part 1 landing now plays at once; the words are already going.
		const one = step(out.state, parts(timed("a", 15, 0), making("b")), 15_000);
		expect(one.state.at).toBe(0);
		expect(one.state.speaking).toBe(true);
		expect(one.marks.map((m) => m.name)).toEqual(["picture-lead-end"]);
	});

	test("part 1 never lands and the words end: the place ends with grace", () => {
		const out = step(led().state, leadTimeout, 13_000).state;
		const done = step(out, narrationEnded, 20_000);
		expect(graceDue(done.state)).toBe(true);
		expect(step(done.state, grace, 23_000).end).toBe("grace");
	});

	test("reduce-motion turns the zoom off", () => {
		expect(leadZoom(led().state, true)).toBe(false);
		expect(LEAD_ZOOM_TO).toBe(1.06);
	});
});
