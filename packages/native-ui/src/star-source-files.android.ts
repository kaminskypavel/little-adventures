// The 16 star take files (8 takes, 2 formats). Both formats carry real transparency:
// WebM with VP9 alpha (Chrome, Firefox, Android) and MOV with HEVC alpha (Safari, iOS).
// Android variant: no .mov. Android resource names ignore the extension, so a .mov and a .webm of
// the same take collide ("Duplicate resources") in the release build.

export const starTakeNames = [
	"idle",
	"wave",
	"jump",
	"listen",
	"think",
	"clap",
	"point",
	"goodnight",
] as const;

export type StarTakeName = (typeof starTakeNames)[number];

interface TakeFiles {
	webm: number;
}

export const starFiles: Record<StarTakeName, TakeFiles> = {
	clap: {
		webm: require("../assets/star/star-clap.webm"),
	},
	goodnight: {
		webm: require("../assets/star/star-goodnight.webm"),
	},
	idle: {
		webm: require("../assets/star/star-idle.webm"),
	},
	jump: {
		webm: require("../assets/star/star-jump.webm"),
	},
	listen: {
		webm: require("../assets/star/star-listen.webm"),
	},
	point: {
		webm: require("../assets/star/star-point.webm"),
	},
	think: {
		webm: require("../assets/star/star-think.webm"),
	},
	wave: {
		webm: require("../assets/star/star-wave.webm"),
	},
};
