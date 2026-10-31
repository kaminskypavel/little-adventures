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
});
