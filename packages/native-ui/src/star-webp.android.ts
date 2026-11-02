import type { StarTakeName } from "./star-source-files";

// Android's players drop the takes' video transparency, so Android plays the same 8 takes as
// animated WebP (real alpha, drawn by expo-image). Android only: no other bundle carries them.
export const starWebp: Record<StarTakeName, number> | null = {
	clap: require("../assets/star/star-clap.webp"),
	goodnight: require("../assets/star/star-goodnight.webp"),
	idle: require("../assets/star/star-idle.webp"),
	jump: require("../assets/star/star-jump.webp"),
	listen: require("../assets/star/star-listen.webp"),
	point: require("../assets/star/star-point.webp"),
	think: require("../assets/star/star-think.webp"),
	wave: require("../assets/star/star-wave.webp"),
};
