import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { faceCutout, faceSquare } from "./cutout";
import { eventData, splitEvents } from "./sse";

describe("sse", () => {
	test("splitEvents keeps the unfinished tail", () => {
		const { blocks, rest } = splitEvents(
			'event: a\ndata: {"type":"x"}\n\nevent: b\r\ndata: {"ty'
		);
		expect(blocks).toEqual(['event: a\ndata: {"type":"x"}']);
		expect(rest).toBe('event: b\r\ndata: {"ty');
	});

	test("eventData parses data lines and skips empty and DONE", () => {
		expect(eventData('event: a\ndata: {"type":"x"}')).toEqual({ type: "x" });
		expect(eventData("data: [DONE]")).toBeNull();
		expect(eventData(": keep-alive")).toBeNull();
	});
});

describe("faceSquare", () => {
	test("uses the shorter box side, centered, a little above the top", () => {
		const box = { x1: 300, x2: 700, y1: 200, y2: 900 };
		expect(faceSquare(box, 1000, 1000)).toEqual({
			left: 300,
			side: 400,
			top: 160,
		});
	});

	test("clamps to the image", () => {
		const box = { x1: 0, x2: 400, y1: 0, y2: 900 };
		expect(faceSquare(box, 1000, 1000)).toEqual({ left: 0, side: 400, top: 0 });
		const low = { x1: 600, x2: 1000, y1: 700, y2: 1000 };
		expect(faceSquare(low, 1000, 1000)).toEqual({
			left: 650,
			side: 300,
			top: 670,
		});
	});
});

describe("faceCutout", () => {
	test("makes a 512 px png, transparent outside the mask", async () => {
		const photo = await sharp({
			create: {
				background: { b: 40, g: 120, r: 200 },
				channels: 3,
				height: 300,
				width: 200,
			},
		})
			.png()
			.toBuffer();
		// Mask: left half of the box set, right half clear.
		const mask = new Uint8Array(10 * 10);
		for (let y = 0; y < 10; y += 1) {
			for (let x = 0; x < 5; x += 1) {
				mask[y * 10 + x] = 1;
			}
		}
		const png = await faceCutout(photo, {
			box: { x1: 50, x2: 150, y1: 100, y2: 250 },
			mask,
			maskHeight: 10,
			maskWidth: 10,
		});
		const { data, info } = await sharp(png)
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect([info.width, info.height, info.channels]).toEqual([512, 512, 4]);
		const alphaAt = (x: number, y: number) =>
			data[(y * info.width + x) * info.channels + 3];
		expect(alphaAt(100, 256)).toBe(255);
		expect(alphaAt(400, 256)).toBe(0);
	});
});
