import { describe, expect, test } from "bun:test";
import {
	pickSource,
	sourceKey,
} from "../../../../packages/native-ui/src/fallback-source";

const remote = { cacheKey: "k", uri: "https://example.test/a.png" };

describe("sourceKey", () => {
	test("tells modules, strings and remote sources apart", () => {
		expect(sourceKey(7)).toBe("module:7");
		expect(sourceKey("a")).toBe("a");
		expect(sourceKey(remote)).toBe(remote.uri);
		expect(sourceKey(null)).toBe("");
	});
});

describe("pickSource", () => {
	test("keeps a source that has not failed", () => {
		expect(pickSource(remote, null, 9)).toBe(remote);
		expect(pickSource(remote, "https://example.test/other.png", 9)).toBe(
			remote
		);
	});

	test("falls back when the source is null", () => {
		expect(pickSource(null, null, 9)).toBe(9);
	});

	test("falls back when this very source failed", () => {
		expect(pickSource(remote, remote.uri, 9)).toBe(9);
	});

	test("gives null when there is no stand-in either", () => {
		expect(pickSource(null, null, null)).toBe(null);
		expect(pickSource(remote, remote.uri, null)).toBe(null);
	});
});
