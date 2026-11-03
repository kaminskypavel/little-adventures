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
	test("cast posts to the node and answers the video url", async () => {
		const { client, requests } = engine(
			json({ durationSec: 42, subtitlesUrl: "s.vtt", url: "u" })
		);
		expect(await client.cast("a 1", "p1")).toEqual({
			durationSec: 42,
			subtitlesUrl: "s.vtt",
			url: "u",
		});
		expect(requests[0].path).toBe("/adventures/a%201/nodes/p1/cast");
		expect(requests[0].init?.method).toBe("POST");
	});

	test("cast answers null on 409 and throws on other errors", async () => {
		const { client } = engine(
			json({ error: "not-ready" }, 409),
			json({ code: "NOT_FOUND", message: "no" }, 404)
		);
		expect(await client.cast("a1", "p1")).toBe(null);
		const failure = await client.cast("a1", "zz").catch((error) => error);
		expect(failure instanceof EngineError).toBe(true);
	});

	test("castMap posts to the adventure and answers the put and read urls", async () => {
		const { client, requests } = engine(json({ putUrl: "p", url: "g" }));
		expect(await client.castMap("a 1")).toEqual({ putUrl: "p", url: "g" });
		expect(requests[0].path).toBe("/adventures/a%201/cast-map");
		expect(requests[0].init?.method).toBe("POST");
		expect(requests[0].init?.body).toBeUndefined();
	});

	test("castMap sends the picture size when it is known", async () => {
		const { client, requests } = engine(json({ putUrl: "p", url: "g" }));
		await client.castMap("a1", 1234);
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			contentLength: 1234,
		});
		expect(requests[0].init?.headers).toEqual({
			"content-type": "application/json",
		});
	});

	test("createAdventure posts the child and the question", async () => {
		const { client, requests } = engine(
			json({ id: "a1", source: "recorded", status: "ready" })
		);
		const made = await client.createAdventure(
			"child-1",
			"Why do whales sing?",
			"felt"
		);
		expect(made.id).toBe("a1");
		expect(requests[0].path).toBe("/adventures");
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			childId: "child-1",
			question: "Why do whales sing?",
			style: "felt",
		});
	});

	test("createDraft posts the child and the question", async () => {
		const { client, requests } = engine(
			json({ id: "d1", status: "drafting" }, 201)
		);
		expect((await client.createDraft("child-1", "Why?")).id).toBe("d1");
		expect(requests[0].path).toBe("/adventures/drafts");
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			childId: "child-1",
			question: "Why?",
		});
	});

	test("startDraft posts the style to the draft", async () => {
		const { client, requests } = engine(
			json({ id: "d1", source: "live", status: "making" })
		);
		await client.startDraft("d1", "wood");
		expect(requests[0].path).toBe("/adventures/d1/start");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			style: "wood",
		});
	});

	test("prepareChild posts to the child", async () => {
		const { client, requests } = engine(json({}, 202));
		await client.prepareChild("child-1");
		expect(requests[0].path).toBe("/children/child-1/prepare");
		expect(requests[0].init?.method).toBe("POST");
	});

	test("shortQuestion posts the question and returns the short one", async () => {
		const { client, requests } = engine(
			json({ isQuestion: true, short: "Why do whales sing?" })
		);
		const out = await client.shortQuestion(
			"um so why do whales like sing a lot"
		);
		expect(out).toEqual({ isQuestion: true, short: "Why do whales sing?" });
		expect(requests[0].path).toBe("/questions/short");
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			question: "um so why do whales like sing a lot",
		});
	});

	test("loaderFacts posts the question and age and returns the facts", async () => {
		const { client, requests } = engine(json({ facts: ["Whales hum."] }));
		const out = await client.loaderFacts("Why do whales sing?", 6);
		expect(out.facts).toEqual(["Whales hum."]);
		expect(requests[0].path).toBe("/questions/facts");
		expect(requests[0].init?.method).toBe("POST");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({
			age: 6,
			question: "Why do whales sing?",
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

	test("getMe reads the account", async () => {
		const me = {
			email: "a@b.c",
			id: "u1",
			isAdmin: true,
			live: false,
			steps: { pictures: true, story: true, video: false, voice: true },
		};
		const { client, requests } = engine(json(me));
		expect(await client.getMe()).toEqual(me);
		expect(requests.map((r) => r.path)).toEqual(["/me"]);
	});

	test("setSteps puts a partial body and answers the four steps", async () => {
		const steps = { pictures: true, story: true, video: true, voice: true };
		const { client, requests } = engine(json({ steps }));
		expect(await client.setSteps({ video: true })).toEqual({ steps });
		expect(requests[0].path).toBe("/me/steps");
		expect(requests[0].init?.method).toBe("PUT");
		expect(JSON.parse(String(requests[0].init?.body))).toEqual({ video: true });
	});

	test("setSteps by a non-admin is an EngineError 403", async () => {
		const { client } = engine(
			json({ code: "FORBIDDEN", message: "Admins only" }, 403)
		);
		let caught: unknown;
		try {
			await client.setSteps({ video: true });
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
