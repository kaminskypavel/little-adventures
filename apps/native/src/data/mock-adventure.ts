import type {
	Adventure,
	AdventureSummary,
	Idea,
	NodeId,
	Place,
	Profile,
} from "./types";

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
	picture,
	status: "ready",
	video: null,
});

export const mockAdventure: Adventure = {
	cast: {
		childAge: 5,
		childKind: "girl",
		childName: "Noa",
		grownUp: false,
		puppy: true,
	},
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

/** Variant for the "still being drawn" edge state. */
export const withDrawing = (node: NodeId): Adventure => ({
	...mockAdventure,
	places: {
		...mockAdventure.places,
		[node]: { ...mockAdventure.places[node], status: "drawing" },
	},
});

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
const theBox = require("../../assets/story/places/the-box.jpg");
const whaleSongs = require("../../assets/story/places/whale-songs.jpg");

export const keepGoing = [
	summary("box", "The Box That Flew", 2, 0, moonDust),
	summary("whales", "Whale songs", 1, 0, whaleSongs),
];
export const finished = [
	summary("moon-done", "The Box That Flew", 6, 4, theBox),
];
export const grownUpList = [
	summary("moon-done", "The Box That Flew", 6, 4, moonDust),
	summary("whales", "Whale songs", 1, 0, whaleSongs),
];

export const ideas: Idea[] = [
	{
		picture: require("../../assets/story/idea-moon.jpg"),
		question: "Why does the moon change shape?",
	},
	{
		picture: require("../../assets/story/idea-bee.jpg"),
		question: "How do bees make honey?",
	},
];

export const transcribedQuestion = "Why do whales sing?";

/** Child name from the cast, never hard-coded in UI strings. */
export const childName = (a: Adventure): string => a.cast.childName;

/** The child profile the mock starts with. */
export const mockProfile: Profile = {
	childAge: 5,
	childKind: "girl",
	childName: "Noa",
	grownUp: false,
	hasPhoto: true,
	look: "clay",
	puppy: true,
};
