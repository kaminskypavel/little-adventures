import { describe, expect, mock, test } from "bun:test";

// The screens' data layer, loaded without a phone: the app's server client, its sign-in and the
// bundled pictures are stood in for. `mock.module` is global to the run, so the mocked modules
// are only ever the ones this file needs and nothing else in the run imports them.
const bundled = { id: "box", question: "How do you get to the moon?" };
const stubChild = { id: "child-1" };

mock.module("@/src/env", () => ({
	ENV: { EXPO_PUBLIC_SERVER_URL: "https://app.test" },
}));
mock.module("@/src/auth/auth-client", () => ({
	authedFetchTo: () => () => {
		throw new Error("the engine must not be called without its url");
	},
}));
mock.module("./trpc", () => ({
	trpcClient: {
		child: { mine: { query: () => Promise.resolve([stubChild]) } },
	},
}));
mock.module("./mock-adventure", () => ({
	finished: [],
	grownUpList: [],
	ideas: [],
	keepGoing: [],
	mockAdventure: bundled,
	transcribedQuestion: "",
}));

describe("without an engine url (AE5)", () => {
	test("getAdventure returns the bundled adventure", async () => {
		const { getAdventure, usesEngine } = await import("./adventure-client");
		expect(usesEngine).toBe(false);
		expect(await getAdventure("anything")).toBe(bundled);
	});

	test("startAdventure hands back the bundled adventure's id", async () => {
		const { startAdventure } = await import("./adventure-client");
		expect((await startAdventure("Why do whales sing?")).id).toBe("box");
	});
});
