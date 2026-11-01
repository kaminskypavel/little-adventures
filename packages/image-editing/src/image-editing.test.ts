import { afterEach, describe, expect, test } from "bun:test";
import sharp from "sharp";

import { faceCutout, faceSquare, fillHoles, objectCutout } from "./cutout";
import { type Candidate, createImageEditing, pickPerson } from "./index";
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

describe("fillHoles", () => {
	test("fills a hole inside the shape and keeps the outside clear", () => {
		// 5x5: a ring of 255 with a clear center, clear outside the ring.
		const a = new Uint8Array(25);
		for (const i of [6, 7, 8, 11, 13, 16, 17, 18]) {
			a[i] = 255;
		}
		const filled = fillHoles(a, 5, 5);
		expect(filled[12]).toBe(255);
		expect(filled[0]).toBe(0);
		expect(filled[24]).toBe(0);
	});
});

describe("objectCutout", () => {
	test("crops to the box with a small margin, transparent outside the mask", async () => {
		const image = await sharp({
			create: {
				background: { b: 40, g: 120, r: 200 },
				channels: 3,
				height: 400,
				width: 400,
			},
		})
			.png()
			.toBuffer();
		// Mask: the top half of the box set, the bottom half clear.
		const mask = new Uint8Array(10 * 10);
		for (let i = 0; i < 50; i += 1) {
			mask[i] = 1;
		}
		const png = await objectCutout(image, {
			box: { x1: 100, x2: 300, y1: 100, y2: 300 },
			mask,
			maskHeight: 10,
			maskWidth: 10,
		});
		const { data, info } = await sharp(png)
			.raw()
			.toBuffer({ resolveWithObject: true });
		// 200 px box plus 4% (8 px) on each side.
		expect([info.width, info.height, info.channels]).toEqual([216, 216, 4]);
		const alphaAt = (x: number, y: number) =>
			data[(y * info.width + x) * info.channels + 3];
		expect(alphaAt(108, 50)).toBe(255);
		expect(alphaAt(108, 170)).toBe(0);
		expect(alphaAt(2, 2)).toBe(0);
	});
});

describe("muse image calls", () => {
	const realFetch = globalThis.fetch;
	const calls: { body: Record<string, unknown>; url: string }[] = [];

	function mockFetch() {
		calls.length = 0;
		globalThis.fetch = ((url: string, init: { body: string }) => {
			calls.push({ body: JSON.parse(init.body), url });
			return Promise.resolve(
				Response.json({
					data: [{ b64_json: Buffer.from("png").toString("base64") }],
				})
			);
		}) as unknown as typeof fetch;
	}

	afterEach(() => {
		globalThis.fetch = realFetch;
	});

	const images = createImageEditing({ apiKey: "key" });

	test("edit sends three references as three image_url objects with the size", async () => {
		mockFetch();
		const result = await images.edit({
			images: ["https://a/1.png", "https://a/2.png", "https://a/3.png"],
			prompt: "draw it",
			safetyId: "grownup-1",
			size: "1280x720",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toEndWith("/images/edits");
		expect(calls[0]?.body).toMatchObject({
			images: [
				{ image_url: "https://a/1.png" },
				{ image_url: "https://a/2.png" },
				{ image_url: "https://a/3.png" },
			],
			model: "muse-image-1.0",
			prompt: "draw it",
			size: "1280x720",
			user: "grownup-1",
		});
		expect(Buffer.from(result.bytes).toString()).toBe("png");
		expect(result.model).toBe("muse-image-1.0");
		expect(result.ms).toBeGreaterThanOrEqual(0);
	});

	test("edit rejects more than 6 references before any request", async () => {
		mockFetch();
		const seven = Array.from({ length: 7 }, (_, i) => `https://a/${i}.png`);
		await expect(
			images.edit({
				images: seven,
				prompt: "draw it",
				safetyId: "grownup-1",
				size: "1024x1024",
			})
		).rejects.toThrow();
		expect(calls).toHaveLength(0);
	});

	test("generate posts the prompt and size to the generations endpoint", async () => {
		mockFetch();
		const result = await images.generate({
			prompt: "a quiet harbour",
			safetyId: "grownup-1",
			size: "1280x720",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toEndWith("/images/generations");
		expect(calls[0]?.body).toEqual({
			model: "muse-image-1.0",
			n: 1,
			output_format: "png",
			prompt: "a quiet harbour",
			reasoning_strength: "low",
			response_format: "b64_json",
			size: "1280x720",
			user: "grownup-1",
		});
		expect(result.model).toBe("muse-image-1.0");
	});

	test("redraw sends the same body as before", async () => {
		mockFetch();
		const bytes = await images.redraw({
			imageUrl: "https://a/photo.png",
			prompt: "paint it",
			safetyId: "grownup-1",
		});
		expect(calls[0]?.url).toEndWith("/images/edits");
		expect(calls[0]?.body).toEqual({
			images: [{ image_url: "https://a/photo.png" }],
			model: "muse-image-1.0",
			n: 1,
			output_format: "png",
			prompt: "paint it",
			reasoning_strength: "low",
			response_format: "b64_json",
			size: "1024x1024",
			user: "grownup-1",
		});
		expect(Buffer.from(bytes).toString()).toBe("png");
	});
});

describe("pickPerson", () => {
	const person = (area: number): Candidate => ({
		area,
		box: { x1: 0, x2: 1, y1: 0, y2: 1 },
		mask: new Uint8Array([1]),
		maskHeight: 1,
		maskWidth: 1,
	});
	const small = person(100);
	const big = person(900);
	/** Stubbed SAM: one photo with a child (small) and a grown-up (big). */
	const family = (matches: Record<string, Candidate[]>) => (prompt: string) => {
		prompts.push(prompt);
		return Promise.resolve(matches[prompt] ?? []);
	};
	let prompts: string[] = [];
	afterEach(() => {
		prompts = [];
	});

	test("asks SAM for the role and takes its match, not the biggest person", async () => {
		const find = family({ adult: [big], child: [small], person: [big, small] });
		expect(await pickPerson("child", find)).toBe(small);
		expect(await pickPerson("grown-up", find)).toBe(big);
		expect(prompts).toEqual(["child", "adult"]);
	});

	test("falls back to all people: smallest is the child, largest the grown-up", async () => {
		const find = family({ person: [big, small] });
		expect(await pickPerson("child", find)).toBe(small);
		expect(await pickPerson("grown-up", find)).toBe(big);
	});

	test("one person in the photo is that person, and nobody gives null", async () => {
		expect(await pickPerson("child", family({ person: [big] }))).toBe(big);
		expect(await pickPerson("grown-up", family({ person: [small] }))).toBe(
			small
		);
		expect(await pickPerson("child", family({}))).toBeNull();
	});

	test("several matches for the role: the largest wins", async () => {
		const find = family({ child: [small, person(300)] });
		expect((await pickPerson("child", find))?.area).toBe(300);
	});
});
