import { describe, expect, test } from "bun:test";
import { createFlickSensor } from "./flick";

// [time ms, |deltaY|] pairs recorded from a Magic Trackpad on the landing page.
const SPIKE_THEN_NEW_FLICK = [
	[31_095, 3],
	[31_111, 13],
	[31_128, 30],
	[31_145, 71],
	[31_161, 111],
	[31_179, 30],
	[31_194, 117],
	[31_228, 147],
	[31_245, 144],
	[31_261, 137],
	[31_278, 129],
	[31_295, 123],
	[31_312, 117],
	[31_328, 109],
	[31_345, 104],
	[31_362, 100],
	[31_378, 94],
	[31_395, 90],
	[31_412, 85],
	[31_429, 81],
	[31_444, 76],
	[31_478, 4],
	[31_495, 25],
	[31_512, 56],
	[31_529, 78],
	[31_545, 107],
];
const DOUBLED_EVENT_IN_DECAY = [
	[33_663, 19],
	[33_680, 49],
	[33_696, 83],
	[33_712, 94],
	[33_729, 115],
	[33_746, 93],
	[33_763, 183],
	[33_780, 171],
	[33_796, 161],
	[33_813, 153],
	[33_830, 143],
	[33_847, 136],
	[33_880, 126],
	[33_897, 120],
	[33_913, 116],
	[33_930, 111],
	[33_947, 106],
	[33_963, 101],
	[33_980, 97],
	[33_996, 93],
	[34_014, 87],
	[34_030, 82],
	[34_047, 79],
	[34_063, 74],
	[34_113, 16],
	[34_130, 26],
	[34_146, 48],
];

const flicks = (events: number[][], claimAt?: number) => {
	const sensor = createFlickSensor();
	if (claimAt !== undefined) {
		sensor.claim(claimAt);
	}
	return events
		.filter(([time, speed]) => sensor.sense(speed, time))
		.map(([time]) => time);
};

describe("flick sensor", () => {
	test("each flick on the last one's momentum counts once, spikes do not", () => {
		expect(flicks(SPIKE_THEN_NEW_FLICK)).toEqual([31_145, 31_512]);
		expect(flicks(DOUBLED_EVENT_IN_DECAY)).toEqual([33_680, 34_146]);
	});

	test("the flick that started a move is not counted again", () => {
		expect(flicks(SPIKE_THEN_NEW_FLICK, 31_128)).toEqual([31_512]);
	});

	test("after a pause, the next scroll is a new flick", () => {
		expect(
			flicks([
				[0, 120],
				[10_000, 120],
			])
		).toEqual([0, 10_000]);
	});

	test("a slow drag never counts", () => {
		expect(
			flicks([
				[0, 20],
				[16, 30],
				[33, 25],
				[50, 35],
				[66, 28],
			])
		).toEqual([]);
	});
});
