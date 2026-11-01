import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { optimisticSet, rollback } from "./optimistic";

const KEY = ["engine", "me"];
const me = { live: false, steps: { video: false } };
type Me = typeof me | null;

describe("optimistic cache write", () => {
	test("sets the change at once and rolls it back", async () => {
		const client = new QueryClient();
		client.setQueryData(KEY, me);
		const snapshot = await optimisticSet<Me>(client, KEY, (m) => ({
			...m,
			live: true,
		}));
		expect(client.getQueryData(KEY)).toEqual({ ...me, live: true });
		rollback(client, KEY, snapshot);
		expect(client.getQueryData(KEY)).toEqual(me);
	});

	test("writes nothing while the cache is empty or null (sample mode)", async () => {
		const client = new QueryClient();
		client.setQueryData(KEY, null);
		const snapshot = await optimisticSet<Me>(client, KEY, (m) => ({
			...m,
			live: true,
		}));
		expect(client.getQueryData(KEY)).toBe(null);
		rollback(client, KEY, snapshot);
		expect(client.getQueryData(KEY)).toBe(null);
	});
});
