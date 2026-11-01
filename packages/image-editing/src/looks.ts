export const LOOKS = ["clay"] as const;

export type Look = (typeof LOOKS)[number];

const BASE = [
	"A head-and-shoulders portrait of the child in the photo, centered, facing the camera.",
	"Plain soft light background, no text.",
	"Keep the face, hair, skin tone and clothes recognizable, with child proportions.",
].join(" ");

const STYLES: Record<Look, string> = {
	clay: "Drawn as a glossy 3D modeling-clay toy, soft studio light.",
};

export const lookPrompt = (look: Look): string => `${BASE} ${STYLES[look]}`;

const GROWN_UP_BASE = [
	"A head-and-shoulders portrait of the adult in the photo, centered, facing the camera.",
	"If the photo also shows a child, draw only the adult. No phone or objects in front of the face.",
	"Plain soft light background, no text.",
	"Keep the face, hair, skin tone and clothes recognizable.",
].join(" ");

/** The grown-up's drawn picture, in the same look as the child's. */
export const grownUpLookPrompt = (look: Look): string =>
	`${GROWN_UP_BASE} ${STYLES[look]}`;
