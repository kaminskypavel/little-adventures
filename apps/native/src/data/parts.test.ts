import { describe, expect, test } from "bun:test";
import {
	begin,
	END_MARGIN_SEC,
	type EndCause,
	graceDue,
	hasParts,
	LEAD_ZOOM_TO,
	leadZoom,
	neighbourUrls,
	type PlayEvent,
	type PlayState,
	reachedEnd,
	slotParts,
	step,
	upcoming,
} from "./parts";
import type { Part } from "./types";

const playable = (id: string): Part => ({
	id,
	status: "playable",
	url: `https://files.test/${id}`,
});
const making = (id: string): Part => ({ id, status: "making", url: null });
const failed = (id: string): Part => ({ id, status: "failed", url: null });

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

describe("two parts and a narration", () => {
	const two = [playable("a"), playable("b")];

	test("the place ends after the later of part 2's end and the narration's end", () => {
		// Part 2 ends last.
		const partLast = drive(
			begin(two, true),
			parts(...two),
			ended,
			narrationEnded,
			ended
		);
		expect(partLast.end).toBe("last-part");
		expect(partLast.marks).toEqual(["part-end 1", "part-end 2"]);
		// The narration ends last.
		const narrationLast = drive(
			begin(two, true),
			parts(...two),
			ended,
			ended,
			narrationEnded
		);
		expect(narrationLast.end).toBe("narration");
	});

	test("the place does not end while either is still going", () => {
		const midway = drive(
			begin(two, true),
			parts(...two),
			ended,
			narrationEnded
		);
		expect(midway.end).toBe(undefined);
		expect(midway.state.at).toBe(1);
		expect(midway.state.phase).toBe("playing");
	});

	test("without narration the last part ends the place", () => {
		const a = drive(begin(two, false), parts(...two), ended, ended);
		expect(a.end).toBe("last-part");
	});

	test("a part's end after the swap does nothing more", () => {
		const a = drive(begin(two, true), parts(...two), ended, ended, ended);
		expect(a.marks).toEqual(["part-end 1", "part-end 2"]);
		expect(a.end).toBe(undefined);
	});

	test("the two players take turns", () => {
		const start = drive(begin(two, true), parts(...two));
		expect(start.state.slot).toBe(0);
		expect(slotParts(start.state)).toEqual([two[0], two[1]]);
		const swapped = drive(start.state, ended);
		expect(swapped.state.slot).toBe(1);
		expect(slotParts(swapped.state)).toEqual([null, two[1]]);
	});
});

describe("the next part is not playable yet", () => {
	test("hold the last frame, mark the stall, and end it when the part is playable", () => {
		const first = [playable("a"), making("b")];
		const held = drive(begin(first, true), parts(...first), ended);
		expect(held.marks).toEqual(["part-end 1", "stall-start 2"]);
		expect(held.state.at).toBe(0);
		expect(held.state.phase).toBe("waiting");
		// The first part is still the one held, and the next has nothing to load yet.
		expect(slotParts(held.state)).toEqual([first[0], null]);

		const resumed = drive(held.state, parts(playable("a"), playable("b")));
		expect(resumed.marks).toEqual(["stall-end 2"]);
		expect(resumed.state.at).toBe(1);
		expect(resumed.state.phase).toBe("playing");
	});

	test("a poll that changes nothing leaves the stall alone", () => {
		const first = [playable("a"), making("b")];
		const held = drive(begin(first, true), parts(...first), ended);
		const again = drive(held.state, parts(playable("a"), making("b")));
		expect(again.marks).toEqual([]);
		expect(again.state).toBe(held.state);
	});

	test("narration done and the part still making: the wait is a stall, then the place ends with grace", () => {
		const first = [playable("a"), making("b")];
		const waiting = drive(
			begin(first, true),
			parts(...first),
			narrationEnded,
			ended
		);
		expect(waiting.marks).toEqual(["part-end 1", "stall-start 2"]);
		expect(waiting.end).toBe(undefined);
		expect(graceDue(waiting.state)).toBe(true);

		const over = drive(waiting.state, grace);
		expect(over.marks).toEqual(["stall-end 2"]);
		expect(over.end).toBe("grace");
	});

	test("the narration ending during the stall starts the wait", () => {
		const first = [playable("a"), making("b")];
		const held = drive(begin(first, true), parts(...first), ended);
		expect(graceDue(held.state)).toBe(false);
		const done = drive(held.state, narrationEnded);
		expect(graceDue(done.state)).toBe(true);
	});

	test("a part that turns playable before the wait runs out plays, not graces", () => {
		const first = [playable("a"), making("b")];
		const waiting = drive(
			begin(first, true),
			parts(...first),
			narrationEnded,
			ended,
			parts(playable("a"), playable("b"))
		);
		expect(waiting.state.at).toBe(1);
		expect(waiting.state.phase).toBe("playing");
		// A late grace event has nothing to end.
		expect(drive(waiting.state, grace).end).toBe(undefined);
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
	test("part 2 failed: skipped with no stall, and the place ends with the narration", () => {
		const list = [playable("a"), failed("b")];
		const played = drive(begin(list, true), parts(...list), ended);
		expect(played.marks).toEqual(["part-end 1"]);
		expect(played.state.phase).toBe("spent");
		expect(played.end).toBe(undefined);
		const over = drive(played.state, narrationEnded);
		expect(over.end).toBe("narration");
	});

	test("part 2 failed and the narration already done: the place ends as part 1 ends", () => {
		const list = [playable("a"), failed("b")];
		const over = drive(
			begin(list, true),
			parts(...list),
			narrationEnded,
			ended
		);
		expect(over.end).toBe("last-part");
		expect(over.marks).toEqual(["part-end 1"]);
	});

	test("a failed middle part is skipped for the next playable one", () => {
		const list = [playable("a"), failed("b"), playable("c")];
		const next = drive(begin(list, true), parts(...list), ended);
		expect(next.state.at).toBe(2);
		expect(next.marks).toEqual(["part-end 1"]);
	});

	test("a part being waited on that then fails ends the stall and lets the narration end the place", () => {
		const list = [playable("a"), making("b")];
		const held = drive(begin(list, true), parts(...list), ended);
		const failedNow = drive(held.state, parts(playable("a"), failed("b")));
		expect(failedNow.marks).toEqual(["stall-end 2"]);
		expect(failedNow.state.phase).toBe("spent");
		expect(drive(failedNow.state, narrationEnded).end).toBe("narration");
	});

	test("a part whose file will not load is skipped; a fresh url may try again", () => {
		const list = [playable("a"), playable("b")];
		const start = drive(begin(list, true), parts(...list));
		// The next part's file fails while part 1 plays.
		const broken = drive(start.state, { id: "b", type: "bad" });
		expect(upcoming(broken.state)).toBe(null);
		expect(drive(broken.state, ended).state.phase).toBe("spent");
		// A read brings the part again under another url.
		const fresh = drive(
			broken.state,
			parts(playable("a"), { ...playable("b"), url: "https://files.test/b2" })
		);
		expect(upcoming(fresh.state)?.url).toBe("https://files.test/b2");
	});

	test("the part on screen failing to load moves on", () => {
		const list = [playable("a"), playable("b")];
		const start = drive(begin(list, true), parts(...list));
		const next = drive(start.state, { id: "a", type: "bad" });
		expect(next.state.at).toBe(1);
		expect(next.marks).toEqual([]);
	});
});

describe("the narration is longer than the parts", () => {
	test("the last frame holds and nothing stalls", () => {
		const list = [playable("a"), playable("b")];
		const held = drive(begin(list, true), parts(...list), ended, ended);
		expect(held.marks).toEqual(["part-end 1", "part-end 2"]);
		expect(held.state.phase).toBe("spent");
		expect(held.state.stall).toBe(null);
		expect(held.end).toBe(undefined);
		expect(graceDue(held.state)).toBe(false);
		// A poll while holding changes nothing.
		expect(drive(held.state, parts(...list)).state).toBe(held.state);
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

	test("with no end event the swap happens when the time reaches length minus 0.1 s", () => {
		const list = [playable("a"), playable("b")];
		const start = drive(begin(list, true), parts(...list));
		const length = 5;
		const ticks = [0.1, 2.5, 4.8, 4.9, 5];
		const swappedAt = ticks.find((time) => reachedEnd(time, length));
		const swapped = drive(start.state, ended);
		expect(swappedAt).toBe(4.9);
		expect(swapped.state.at).toBe(1);
		expect(swapped.state.slot).toBe(1);
	});

	test("an end event while no part is running does nothing", () => {
		const list = [playable("a"), making("b")];
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
	const started: PlayEvent = { type: "started" };

	test("picture and narration start the place before any part is playable", () => {
		const led = step(begin(first, true, true), started, 1000);
		expect(led.marks).toEqual([{ name: "picture-lead-start", part: 1 }]);
		expect(led.state.lead).toEqual({ ended: false, since: 1000 });
		expect(leadZoom(led.state, false)).toBe(true);
		// Started again: nothing more.
		expect(step(led.state, started, 2000).marks).toEqual([]);
	});

	test("no picture, no narration or a playable first part: no lead", () => {
		expect(step(begin(first, true), started, 0).state.lead).toBe(null);
		expect(step(begin(first, false, true), started, 0).state.lead).toBe(null);
		const ready = [playable("a"), making("b")];
		expect(step(begin(ready, true, true), started, 0).state.lead).toBe(null);
	});

	test("part 1 turning playable ends the lead with its length, then part 2 follows", () => {
		const led = step(begin(first, true, true), started, 1000).state;
		const one = step(led, parts(playable("a"), making("b")), 4500);
		expect(one.marks).toEqual([
			{ leadMs: 3500, name: "picture-lead-end", part: 1 },
		]);
		expect(one.state.at).toBe(0);
		expect(leadZoom(one.state, false)).toBe(false);
		const over = step(one.state, ended, 9000);
		expect(over.marks).toEqual([
			{ name: "part-end", part: 1 },
			{ name: "stall-start", part: 2 },
		]);
		const two = step(over.state, parts(playable("a"), playable("b")), 9500);
		expect(two.marks.map((m) => m.name)).toEqual(["stall-end"]);
		expect(two.state.at).toBe(1);
		expect(two.state.lead?.ended).toBe(true);
	});

	test("part 1 failing keeps the picture and the place ends with the narration", () => {
		const led = step(begin(first, true, true), started, 0).state;
		const lost = step(led, parts(failed("a"), failed("b")), 100);
		expect(lost.marks).toEqual([]);
		expect(lost.state.lead?.ended).toBe(false);
		expect(lost.end).toBe(undefined);
		const done = step(lost.state, narrationEnded, 5000);
		expect(done.end).toBe("narration");
	});

	test("reduce-motion turns the zoom off", () => {
		const led = step(begin(first, true, true), started, 0).state;
		expect(leadZoom(led, true)).toBe(false);
		expect(LEAD_ZOOM_TO).toBe(1.06);
	});
});
