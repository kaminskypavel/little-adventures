import { describe, expect, test } from "bun:test";
import { createDraftStore } from "./draft-store";
import { EngineError, type Style } from "./engine-client";

/** A fake engine that records its calls. `startFails` and `draftFails` make those calls fail. */
function setup(opts: { draftFails?: boolean; startFails?: Error[] } = {}) {
	const failures = [...(opts.startFails ?? [])];
	const calls = {
		create: [] as [string, Style][],
		createDraft: [] as string[],
		prepare: 0,
		start: [] as [string, Style][],
	};
	const store = createDraftStore({
		create: (question, style) => {
			calls.create.push([question, style]);
			return Promise.resolve({ id: "made-1" });
		},
		createDraft: (question) => {
			calls.createDraft.push(question);
			return opts.draftFails
				? Promise.reject(new Error("offline"))
				: Promise.resolve({ id: "draft-1" });
		},
		prepare: () => {
			calls.prepare += 1;
			return Promise.resolve({});
		},
		sleep: () => Promise.resolve(),
		start: (id, style) => {
			calls.start.push([id, style]);
			const failure = failures.shift();
			return failure ? Promise.reject(failure) : Promise.resolve({});
		},
	});
	return { calls, store };
}

const Q = "Why do whales sing?";

describe("draft store", () => {
	test("a draft then Start drafts once, starts once and returns the draft id", async () => {
		const { calls, store } = setup();
		store.beginDraft(Q);
		const id = await store.startDrafted({ question: Q, style: "felt" });
		expect(id).toBe("draft-1");
		expect(calls.createDraft).toEqual([Q]);
		expect(calls.start).toEqual([["draft-1", "felt"]]);
		expect(calls.create).toEqual([]);
	});

	test("Start with no draft uses the create call", async () => {
		const { calls, store } = setup();
		const id = await store.startDrafted({ question: Q, style: "clay" });
		expect(id).toBe("made-1");
		expect(calls.create).toEqual([[Q, "clay"]]);
		expect(calls.start).toEqual([]);
	});

	test("a draft request that fails falls back to create", async () => {
		const { calls, store } = setup({ draftFails: true });
		store.beginDraft(Q);
		expect(await store.startDrafted({ question: Q, style: "wood" })).toBe(
			"made-1"
		);
		expect(calls.create).toEqual([[Q, "wood"]]);
		expect(calls.start).toEqual([]);
	});

	test("a start that answers 403, 404 or 409 falls back to create", async () => {
		for (const status of [403, 404, 409]) {
			const { calls, store } = setup({
				startFails: [new EngineError(status, "GONE", "gone")],
			});
			store.beginDraft(Q);
			// biome-ignore lint/performance/noAwaitInLoops: each case runs on its own store
			const id = await store.startDrafted({ question: Q, style: "animated" });
			expect(id).toBe("made-1");
			expect(calls.start.length).toBe(1);
			expect(calls.create).toEqual([[Q, "animated"]]);
		}
	});

	test("a server error or dropped connection on start is retried once, never created", async () => {
		for (const error of [
			new EngineError(503, "BUSY", "busy"),
			new Error("network"),
		]) {
			const { calls, store } = setup({ startFails: [error] });
			store.beginDraft(Q);
			// biome-ignore lint/performance/noAwaitInLoops: each case runs on its own store
			const id = await store.startDrafted({ question: Q, style: "clay" });
			expect(id).toBe("draft-1");
			expect(calls.start.length).toBe(2);
			expect(calls.create).toEqual([]);
		}
	});

	test("two failed starts throw and never create", async () => {
		const { calls, store } = setup({
			startFails: [new Error("network"), new Error("network")],
		});
		store.beginDraft(Q);
		let failed = false;
		try {
			await store.startDrafted({ question: Q, style: "clay" });
		} catch {
			failed = true;
		}
		expect(failed).toBe(true);
		expect(calls.start.length).toBe(2);
		expect(calls.create).toEqual([]);
	});

	test("two Starts for one question start once and never create twice", async () => {
		const { calls, store } = setup();
		store.beginDraft(Q);
		const [a, b] = await Promise.all([
			store.startDrafted({ question: Q, style: "clay" }),
			store.startDrafted({ question: Q, style: "clay" }),
		]);
		const c = await store.startDrafted({ question: Q, style: "clay" });
		expect([a, b, c]).toEqual(["draft-1", "draft-1", "draft-1"]);
		expect(calls.start.length).toBe(1);
		expect(calls.create).toEqual([]);
	});

	test("asking the same question again drafts and starts anew", async () => {
		const { calls, store } = setup();
		store.beginDraft(Q);
		await store.startDrafted({ question: Q, style: "clay" });
		store.beginDraft(Q);
		await store.startDrafted({ question: Q, style: "clay" });
		expect(calls.createDraft.length).toBe(2);
		expect(calls.start.length).toBe(2);
	});

	test("prepare runs once per session however often Home opens", () => {
		const { calls, store } = setup();
		store.prepareOnce();
		store.prepareOnce();
		expect(calls.prepare).toBe(1);
	});
});
