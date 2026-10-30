// Placeholder beats for the pinned story. Order and copy are edited here.
// Each id also names one transition in story-timeline.ts and one phone
// screen in phone.tsx, so keep ids stable and change the words freely.
export const beats = [
	{
		caption: "One phone. Two curious kids.",
		id: "evening",
		screen: { title: "Little Adventures" },
	},
	{
		caption: "Your child asks a question out loud.",
		id: "ask",
		screen: { title: "I'm listening..." },
	},
	{
		caption: "The star hears it, and hops out to help.",
		id: "star",
		screen: { title: "Little Adventures" },
	},
	{
		caption: "A map grows from the question: four places, then goodnight.",
		id: "map",
		screen: { title: "Your map" },
	},
	{
		caption: "Your child picks the way.",
		id: "choose",
		screen: { title: "Which way?" },
	},
	{
		caption: "And it always ends in goodnight.",
		id: "goodnight",
		screen: { title: "Tonight we found out" },
	},
] as const;

export type BeatId = (typeof beats)[number]["id"];

/** Wide shape of one beat, for code that reads the optional `line`. */
export interface Beat {
	readonly caption: string;
	readonly id: BeatId;
	readonly screen: { readonly line?: string; readonly title: string };
}
