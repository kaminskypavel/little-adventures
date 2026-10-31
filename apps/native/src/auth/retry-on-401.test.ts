import { describe, expect, test } from "bun:test";
import { withRetryOn401 } from "./retry-on-401";

const reply = (status: number) => new Response(null, { status });

/** A world where the server answers with `statuses` in order and `minted` is what mint gives. */
function world(statuses: number[], minted: string | null) {
	const seen: (string | null)[] = [];
	const calls = { mint: 0, signOut: 0 };
	const run = () =>
		withRetryOn401({
			call: (jwt) => {
				seen.push(jwt);
				return Promise.resolve(reply(statuses[seen.length - 1] ?? 200));
			},
			getToken: () => Promise.resolve("old"),
			mint: () => {
				calls.mint += 1;
				return Promise.resolve(minted);
			},
			signOut: () => {
				calls.signOut += 1;
				return Promise.resolve();
			},
		});
	return { calls, run, seen };
}

describe("withRetryOn401", () => {
	test("a good answer passes through untouched", async () => {
		const w = world([200], "new");
		const res = await w.run();
		expect(res.status).toBe(200);
		expect(w.seen).toEqual(["old"]);
		expect(w.calls).toEqual({ mint: 0, signOut: 0 });
	});

	test("a 401 mints once and retries once with the new token", async () => {
		const w = world([401, 200], "new");
		const res = await w.run();
		expect(res.status).toBe(200);
		expect(w.seen).toEqual(["old", "new"]);
		expect(w.calls).toEqual({ mint: 1, signOut: 0 });
	});

	test("a second 401 signs out and does not retry again", async () => {
		const w = world([401, 401, 200], "new");
		const res = await w.run();
		expect(res.status).toBe(401);
		expect(w.seen).toEqual(["old", "new"]);
		expect(w.calls).toEqual({ mint: 1, signOut: 1 });
	});

	test("no fresh token signs out without a retry", async () => {
		const w = world([401, 200], null);
		const res = await w.run();
		expect(res.status).toBe(401);
		expect(w.seen).toEqual(["old"]);
		expect(w.calls).toEqual({ mint: 1, signOut: 1 });
	});
});
