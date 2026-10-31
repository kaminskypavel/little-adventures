import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createStoryStore } from "./story-store";

const SCENES = 7;
const CALM_MS = 350;
let now = 1000;
const clock = spyOn(performance, "now").mockImplementation(() => now);

afterEach(() => {
	now = 1000;
});

describe("story store", () => {
	test("starts on the first scene, ready to move", () => {
		const story = createStoryStore().getState();
		expect(story.at).toBe(0);
		expect(story.canGo(1, SCENES)).toBe(true);
	});

	test("only neighbouring scenes inside the story can be reached", () => {
		const story = createStoryStore().getState();
		expect(story.canGo(-1, SCENES)).toBe(false);
		expect(story.canGo(0, SCENES)).toBe(false);
		expect(story.canGo(SCENES, SCENES)).toBe(false);
	});

	test("one move at a time: input waits while a move plays", () => {
		const store = createStoryStore();
		store.getState().leave();
		expect(store.getState().canGo(1, SCENES)).toBe(false);
	});

	test("after landing, momentum is ignored for the calm window, then input works", () => {
		const store = createStoryStore();
		store.getState().leave();
		store.getState().arrive(1, CALM_MS);
		expect(store.getState().at).toBe(1);
		expect(store.getState().busy).toBe(false);
		now += CALM_MS - 1;
		expect(store.getState().canGo(2, SCENES)).toBe(false);
		now += 1;
		expect(store.getState().canGo(2, SCENES)).toBe(true);
		expect(store.getState().canGo(0, SCENES)).toBe(true);
	});

	test("uses the page clock", () => {
		createStoryStore().getState().canGo(1, SCENES);
		expect(clock).toHaveBeenCalled();
	});

	test("a touch swipe skips the calm window: a finger has no momentum", () => {
		const store = createStoryStore();
		store.getState().press();
		store.getState().leave();
		store.getState().arrive(1, CALM_MS);
		store.getState().press();
		expect(store.getState().canGo(2, SCENES, true)).toBe(true);
	});

	test("the swipe that started a move never moves twice, even after it lands", () => {
		const store = createStoryStore();
		store.getState().press();
		store.getState().leave();
		store.getState().queueSwipe(1);
		expect(store.getState().arrive(1, CALM_MS)).toBe(0);
		expect(store.getState().canGo(2, SCENES, true)).toBe(false);
	});

	test("a new swipe during a move is kept and played when the move lands", () => {
		const store = createStoryStore();
		store.getState().press();
		store.getState().leave();
		store.getState().press();
		store.getState().queueSwipe(1);
		expect(store.getState().arrive(1, CALM_MS)).toBe(1);
		expect(store.getState().canGo(2, SCENES, true)).toBe(true);
		expect(store.getState().arrive(2, CALM_MS)).toBe(0);
	});

	test("nothing is kept while no move plays", () => {
		const store = createStoryStore();
		store.getState().press();
		store.getState().queueSwipe(-1);
		expect(store.getState().queued).toBe(0);
	});
});
