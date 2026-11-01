export const LOOKS = ["clay"] as const;

export type Look = (typeof LOOKS)[number];

const BASE = [
	"Turn the child in the photo into a handmade 3D modeling-clay figurine. Head and shoulders only, cut off at the chest, centered, facing the camera.",
	"Plain soft light background, no text.",
	"Keep what makes them recognizable: hair colour and style, skin tone, eye colour and the colours of their clothes, with child proportions.",
].join(" ");

// The app's own characters (the star, the puppy) are clay toys: the people must read as toys too.
const STYLES: Record<Look, string> = {
	clay: [
		"Sculpted like a stop-motion clay character: smooth glossy plasticine with a soft fingerprint texture,",
		"simple rounded shapes, big friendly eyes, a small simple nose and smile, chunky sculpted hair.",
		"It must look like a toy figure, not a photo or a painting. Only the figure, no base, stand, plinth or decorations:",
		"the bottom edge of the picture cuts through their top.",
		"Soft studio light.",
	].join(" "),
};

export const lookPrompt = (look: Look): string => `${BASE} ${STYLES[look]}`;

const GROWN_UP_BASE = [
	"Turn the adult in the photo into a handmade 3D modeling-clay figurine. Head and shoulders only, cut off at the chest, centered, facing the camera.",
	"If the photo also shows a child, make only the adult. No phone or objects in front of the face.",
	"Plain soft light background, no text.",
	"Keep what makes them recognizable: hair colour and style, facial hair, skin tone, eye colour and the colours of their clothes.",
].join(" ");

/** The grown-up's drawn picture, in the same look as the child's. */
export const grownUpLookPrompt = (look: Look): string =>
	`${GROWN_UP_BASE} ${STYLES[look]}`;
