import type { Adventure, AdventureSummary, Idea, NodeId, Place } from "./types";

const place = (
	id: NodeId,
	name: string,
	fact: string,
	line: string,
	picture: number | null
): Place => ({
	fact,
	id,
	name,
	narration: line.split(" "),
	parts: [],
	picture,
	status: "ready",
});

export const mockAdventure: Adventure = {
	endGoal: {
		closed: require("../../assets/story/moon-gate.png"),
		name: "Goodnight moon",
		open: require("../../assets/story/moon-open.png"),
	},
	id: "box",
	places: {
		intro: place(
			"intro",
			"The box",
			"",
			"Noa found a big box that could fly.",
			require("../../assets/story/places/the-box.jpg")
		),
		outro: place(
			"outro",
			"Goodnight",
			"",
			"And the moon said goodnight, Noa.",
			null
		),
		p1: place(
			"p1",
			"Moon dust",
			"Moon dust keeps footprints",
			"Noa scooped up the silver dust and watched it float.",
			require("../../assets/story/places/moon-dust.jpg")
		),
		p1a: place(
			"p1a",
			"Glow flowers",
			"Some flowers glow",
			"Soft flowers glowed along the path like little lamps.",
			require("../../assets/story/places/glow-flowers.jpg")
		),
		p2: place(
			"p2",
			"Earth rise",
			"Earth is a blue marble",
			"Noa looked back and saw the Earth rise, round and blue.",
			require("../../assets/story/places/earth-rise.jpg")
		),
		p2a: place(
			"p2a",
			"Moon robot",
			"A robot can be a friend",
			"A small moon robot waved hello and showed the way.",
			require("../../assets/story/places/moon-robot.jpg")
		),
	},
	question: "How do you get to the moon?",
	title: "The Box That Flew",
};

const summary = (
	id: string,
	title: string,
	partsDone: number,
	foundCount: number,
	picture: number
): AdventureSummary => ({
	finished: partsDone === 6,
	foundCount,
	id,
	partsDone,
	partsTotal: 6,
	picture,
	title,
});

const moonDust = require("../../assets/story/places/moon-dust.jpg");
const whaleSongs = require("../../assets/story/places/whale-songs.jpg");
const earthRise = require("../../assets/story/places/earth-rise.jpg");
const glowFlowers = require("../../assets/story/places/glow-flowers.jpg");
const theBox = require("../../assets/story/places/the-box.jpg");
const ideaBee = require("../../assets/story/idea-bee.jpg");
const ideaMoon = require("../../assets/story/idea-moon.jpg");

export const keepGoing = [
	summary("box", "The Box That Flew", 2, 0, theBox),
	summary("whales", "Whale songs", 1, 0, whaleSongs),
];
export const finished = [
	summary("bees-done", "Honey bees", 6, 3, ideaBee),
	summary("moon-done", "Moon shapes", 6, 4, ideaMoon),
	summary("earth-done", "Earth rise", 6, 2, earthRise),
	summary("flowers-done", "Glow flowers", 6, 5, glowFlowers),
];
export const grownUpList = [
	summary("moon-done", "The Box That Flew", 6, 4, moonDust),
	summary("whales", "Whale songs", 1, 0, whaleSongs),
];

export const ideas: Idea[] = [
	{ picture: ideaMoon, question: "Why does the moon change shape?" },
	{ picture: ideaBee, question: "How do bees make honey?" },
	{ picture: whaleSongs, question: "Why do whales sing?" },
	{ picture: theBox, question: "How can a box fly?" },
	{ picture: glowFlowers, question: "Why do flowers glow?" },
];

export const transcribedQuestion = "Why do whales sing?";
