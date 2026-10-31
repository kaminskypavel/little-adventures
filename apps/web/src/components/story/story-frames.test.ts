import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { spawnSync } from "bun";
import { SCENE_COUNT } from "./story-plan";

// The images line up: every move starts on the frame of the scene it leaves and
// ends on the frame of the scene it lands on, so nothing jumps between clips.
// Frames are compared as 32x18 greyscale thumbnails (mean difference, 0 to 255).
// The clips are not in the repo: point STORY_MEDIA_DIR at a local copy (the upload script does).
const DIR = process.env.STORY_MEDIA_DIR ?? "";
const MAX_DIFF = 14;
const hasFfmpeg = spawnSync(["ffmpeg", "-version"], {
	stderr: "ignore",
	stdout: "ignore",
}).success;

const thumb = (file: string, where: "first" | "last") => {
	const seek = where === "last" ? ["-sseof", "-0.05"] : [];
	const out = spawnSync([
		"ffmpeg",
		"-loglevel",
		"error",
		...seek,
		"-i",
		join(DIR, file),
		"-frames:v",
		"1",
		"-vf",
		"scale=32:18,format=gray",
		"-f",
		"rawvideo",
		"-",
	]);
	return out.stdout;
};
const diff = (a: Uint8Array, b: Uint8Array) => {
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		sum += Math.abs(a[i] - b[i]);
	}
	return sum / a.length;
};

describe.skipIf(!(hasFfmpeg && DIR))("moves line up with the scenes", () => {
	for (const shape of ["w", "t"]) {
		for (let scene = 1; scene < SCENE_COUNT; scene += 1) {
			test(`${shape === "w" ? "computer" : "phone"} move into scene ${scene}`, () => {
				const move = `move-${shape}${scene}.mp4`;
				expect(
					diff(
						thumb(move, "first"),
						thumb(`still-${shape}${scene - 1}.webp`, "first")
					)
				).toBeLessThan(MAX_DIFF);
				expect(
					diff(
						thumb(move, "last"),
						thumb(`still-${shape}${scene}.webp`, "first")
					)
				).toBeLessThan(MAX_DIFF);
			});
		}
	}
});

// A scene swaps its still for its loop once the loop plays, so the loop starts on that still.
describe.skipIf(!(hasFfmpeg && DIR))("loops start on their scene", () => {
	for (const shape of ["w", "t"]) {
		for (let scene = 0; scene < SCENE_COUNT; scene += 1) {
			test(`${shape === "w" ? "computer" : "phone"} loop in scene ${scene}`, () => {
				expect(
					diff(
						thumb(`loop-${shape}${scene}.mp4`, "first"),
						thumb(`still-${shape}${scene}.webp`, "first")
					)
				).toBeLessThan(MAX_DIFF);
			});
		}
	}
});
