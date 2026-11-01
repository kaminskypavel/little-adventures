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
