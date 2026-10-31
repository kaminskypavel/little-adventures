// The slides of the landing story. Order and copy are edited here.
// Each id also names one pose in slide-poses.ts. Keep ids stable and change
// the words freely. The first slide's text is the wordmark, the tagline and
// the store badges; the last slide's text ends with the badges and the footer.
export const slides = [
	{
		id: "hello",
		sub: "Stories that start with your child's curiosity.",
	},
	{
		id: "ask",
		sub: "Your child asks out loud. One tap on the mic, no typing.",
		title: "It starts with a question.",
	},
	{
		id: "liftoff",
		sub: "A little adventure grows from the question, with your child as the hero.",
		title: "The star says: let's find out!",
	},
	{
		id: "choose",
		sub: "Each stop is a short story that ends on a choice.",
		title: "Your child picks the way.",
	},
	{
		id: "goodnight",
		sub: "Every story ends with what your child found out, and a calm goodnight.",
		title: "A small adventure. Then goodnight.",
	},
] as const;

export type SlideId = (typeof slides)[number]["id"];

/** Wide shape of one slide, for code that reads the optional title. */
export interface Slide {
	readonly id: SlideId;
	readonly sub: string;
	readonly title?: string;
}

/** What the boy says on the second slide. */
export const QUESTION = "Can we fly to the moon?";

/** The two places the child can pick from on the fourth slide. */
export const PLACES = [
	{ id: "planetA", name: "Moon dust", src: "/places/moon-dust.jpg" },
	{ id: "planetB", name: "Earth rise", src: "/places/earth-rise.jpg" },
] as const;

export const FOOTER_LINE = "© 2026 Little Adventures · littleadventures.app";
