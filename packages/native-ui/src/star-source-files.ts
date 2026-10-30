// The 16 star take files (8 takes, 2 formats). Both formats carry real transparency:
// WebM with VP9 alpha (Chrome, Firefox, Android) and MOV with HEVC alpha (Safari, iOS).
// Which one to play is decided in star-source.ts and star-source.web.ts.

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
	mov: number;
	webm: number;
}

export const starFiles: Record<StarTakeName, TakeFiles> = {
	clap: {
		mov: require("../assets/star/star-clap.mov"),
		webm: require("../assets/star/star-clap.webm"),
	},
	goodnight: {
		mov: require("../assets/star/star-goodnight.mov"),
		webm: require("../assets/star/star-goodnight.webm"),
	},
	idle: {
		mov: require("../assets/star/star-idle.mov"),
		webm: require("../assets/star/star-idle.webm"),
	},
	jump: {
		mov: require("../assets/star/star-jump.mov"),
		webm: require("../assets/star/star-jump.webm"),
	},
	listen: {
		mov: require("../assets/star/star-listen.mov"),
		webm: require("../assets/star/star-listen.webm"),
	},
	point: {
		mov: require("../assets/star/star-point.mov"),
		webm: require("../assets/star/star-point.webm"),
	},
	think: {
		mov: require("../assets/star/star-think.mov"),
		webm: require("../assets/star/star-think.webm"),
	},
	wave: {
		mov: require("../assets/star/star-wave.mov"),
		webm: require("../assets/star/star-wave.webm"),
	},
};
