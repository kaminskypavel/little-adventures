import { describe, expect, test } from "bun:test";
import {
	createEngineClient,
	EngineError,
	makeExpiryGuard,
	POLL_FALLBACK_SEC,
	pollAdventure,
} from "./engine-client";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		headers: { "content-type": "application/json" },
		status,
	});

/** An engine that records each request and answers with the next reply. */
function engine(...replies: Response[]) {
	const requests: { init?: RequestInit; path: string }[] = [];
	const client = createEngineClient((path, init) => {
		requests.push({ init, path });
		return Promise.resolve(
			replies[requests.length - 1] ??
				json({ code: "NONE", message: "none" }, 500)
		);
	});
	return { client, requests };
}

describe("engine client", () => {
	test("createAdventure posts the child and the question", async () => {
		const { client, requests } = engine(
			json({ id: "a1", source: "recorded", status: "ready" })
		);
		const made = await client.createAdventure("child-1", "Why do whales sing?");
		expect(made.id).toBe("a1");
		expect(requests[0].path).toBe("/adventures");
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			childId: "child-1",
			question: "Why do whales sing?",
			style: "clay",
		});
	});

	test("shortQuestion posts the question and returns the short one", async () => {
		const { client, requests } = engine(json({ short: "Why do whales sing?" }));
		const out = await client.shortQuestion(
			"um so why do whales like sing a lot"
		);
		expect(out.short).toBe("Why do whales sing?");
		expect(requests[0].path).toBe("/questions/short");
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			question: "um so why do whales like sing a lot",
		});
	});

	test("getAdventure, listAdventures and visitNode use their routes", async () => {
		const { client, requests } = engine(
			json({ id: "a1", nodes: [], pollAfterSec: null }),
			json({ items: [{ id: "a1" }] }),
			json({ outroLocked: true, placesDone: 1 })
		);
		await client.getAdventure("a1");
		const list = await client.listAdventures();
		const visit = await client.visitNode("a1", "p1");
		expect(list.length).toBe(1);
		expect(visit).toEqual({ outroLocked: true, placesDone: 1 });
		expect(requests.map((r) => r.path)).toEqual([
			"/adventures/a1",
			"/adventures",
			"/adventures/a1/nodes/p1/visit",
		]);
		expect(requests[2].init?.method).toBe("POST");
	});

	test("getMe reads the account and setLive puts the switch", async () => {
		const me = { email: "a@b.c", id: "u1", isAdmin: true, live: false };
		const { client, requests } = engine(json(me), json({ live: true }));
		expect(await client.getMe()).toEqual(me);
		expect(await client.setLive(true)).toEqual({ live: true });
		expect(requests.map((r) => r.path)).toEqual(["/me", "/me/live"]);
		expect(requests[1].init?.method).toBe("PUT");
		expect(JSON.parse(String(requests[1].init?.body))).toEqual({ on: true });
	});

	test("setLive by a non-admin is an EngineError 403", async () => {
		const { client } = engine(
			json({ code: "FORBIDDEN", message: "Admins only" }, 403)
		);
		let caught: unknown;
		try {
			await client.setLive(true);
		} catch (error) {
			caught = error;
		}
		expect((caught as EngineError).status).toBe(403);
		expect((caught as EngineError).code).toBe("FORBIDDEN");
	});

	test("an error body becomes an EngineError with its code and status", async () => {
		const { client } = engine(
			json({ code: "PRECONDITION_FAILED", message: "Goodnight is locked" }, 412)
		);
		let caught: unknown;
		try {
			await client.visitNode("a1", "outro");
		} catch (error) {
			caught = error;
		}
		expect(caught instanceof EngineError).toBe(true);
		expect((caught as EngineError).status).toBe(412);
		expect((caught as EngineError).code).toBe("PRECONDITION_FAILED");
	});
});

describe("pollAdventure", () => {
	const sequence = (waits: (number | null)[]) => {
		const sleeps: number[] = [];
		let reads = 0;
		const read = () => {
			reads += 1;
			return Promise.resolve({ pollAfterSec: waits[reads - 1] ?? null });
		};
		const sleep = (ms: number) => {
			sleeps.push(ms);
			return Promise.resolve();
		};
		return { read, reads: () => reads, sleep, sleeps };
	};

	test("waits the engine's pollAfterSec between reads and stops when it is null", async () => {
		const s = sequence([3, 5, null]);
		const seen: unknown[] = [];
		await pollAdventure({
			isLive: () => true,
			onFailed: () => undefined,
			onRead: (a) => seen.push(a.pollAfterSec),
			read: s.read,
			sleep: s.sleep,
		});
		expect(s.reads()).toBe(3);
		expect(s.sleeps).toEqual([3000, 5000]);
		expect(seen).toEqual([3, 5, null]);
	});

	test("stops reading as soon as the screen is gone", async () => {
		const s = sequence([3, 3, 3]);
		let live = true;
		await pollAdventure({
			isLive: () => live,
			onFailed: () => undefined,
			onRead: () => {
				live = false;
			},
			read: s.read,
			sleep: s.sleep,
		});
		expect(s.reads()).toBe(1);
		expect(s.sleeps).toEqual([]);
	});

	test("a failed read is reported and the next read comes after the fallback wait", async () => {
		const sleeps: number[] = [];
		let reads = 0;
		let failed = 0;
		await pollAdventure({
			isLive: () => true,
			onFailed: () => {
				failed += 1;
			},
			onRead: () => undefined,
			read: () => {
				reads += 1;
				return reads === 1
					? Promise.reject(new Error("offline"))
					: Promise.resolve({ pollAfterSec: null });
			},
			sleep: (ms) => {
				sleeps.push(ms);
				return Promise.resolve();
			},
		});
		expect(failed).toBe(1);
		expect(reads).toBe(2);
		expect(sleeps).toEqual([POLL_FALLBACK_SEC * 1000]);
	});
});

describe("makeExpiryGuard", () => {
	test("an expired media url triggers one re-read, however often it fails", () => {
		let rereads = 0;
		const expired = makeExpiryGuard(() => {
			rereads += 1;
		});
		expired();
		expired();
		expired();
		expect(rereads).toBe(1);
	});
});
