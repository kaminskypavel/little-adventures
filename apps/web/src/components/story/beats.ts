// The beats of the pinned story. Order and copy are edited here.
// Each id also names one transition in story-timeline.ts. A beat with a
// `screen` also owns one phone screen in phone.tsx. Keep ids stable and
// change the words freely.
export const beats = [
	{
		caption: "Stories that start with your child's curiosity.",
		id: "hello",
		screen: { still: true, title: "Little Adventures" },
	},
	{
		caption: "Your child asks a question out loud.",
		id: "ask",
		screen: { still: true, title: "I'm listening..." },
	},
	{
		caption: "The star hears it, and hops out to help.",
		id: "star",
		screen: { title: "Little Adventures" },
	},
	{
		caption: "A little adventure grows from the question, starring your child.",
		id: "adventure",
	},
	{
		caption: "Your child picks the way.",
		id: "choose",
	},
	{
		caption: "And it always ends in goodnight.",
		id: "goodnight",
		screen: { title: "Tonight we found out" },
	},
] as const;

export type BeatId = (typeof beats)[number]["id"];

/** Wide shape of one beat, for code that reads the optional parts. */
export interface Beat {
	readonly caption: string;
	readonly id: BeatId;
	readonly screen?: {
		readonly line?: string;
		readonly still?: boolean;
		readonly title: string;
	};
}
