import {
	decodeMaskToRaster,
	parseImageStream,
	type ResponsesEvent,
	recordsOfKind,
} from "@meta-sam/parser";

import type { Found } from "./cutout";
import { sseEvents } from "./sse";

/**
 * Meta's Model API: SAM 3.1 to find the child in a photo, Muse Image 1.0 to
 * redraw the photo. Plain `fetch`, no retries (a retry is billed again).
 * The key is injected by the app; this package reads no env.
 *
 * Calls throw on any failure; the caller decides what that means.
 */

const BASE_URL = "https://api.meta.ai/v1";
const SAM_MODEL = "sam-3.1";
const MUSE_IMAGE_MODEL = "muse-image-1.0";
const REQUEST_TIMEOUT_MS = 100_000;

/** SAM 3.1 on one image: $2.50 per 1,000 images. */
export const SAM_COST_MICRO_USD = 2500;
/** Muse Image 1.0: $0.01 per image. */
export const MUSE_IMAGE_COST_MICRO_USD = 10_000;

export const MODELS = { redraw: MUSE_IMAGE_MODEL, segment: SAM_MODEL } as const;

const MAX_REFERENCES = 6;

/** Whose photo it is: decides which person in a shared photo is cut out. */
export type PersonRole = "child" | "grown-up";

/** Wraps one SAM request, for example to record its cost. */
export type Track = <T>(call: () => Promise<T>) => Promise<T>;

export type Candidate = Found & { area: number };

const PEOPLE = "person";
const ROLES = {
	child: { fallback: "smallest", prompt: "child" },
	"grown-up": { fallback: "largest", prompt: "adult" },
} as const;

/**
 * Picks the person for a role from what SAM finds. The role's own prompt
 * ("child", "adult") goes first and the largest match wins. When SAM finds
 * nothing for it, all people are searched and the smallest is the child, the
 * largest the grown-up. A photo of one person gives that person either way.
 */
export async function pickPerson(
	role: PersonRole,
	find: (prompt: string) => Promise<Candidate[]>
): Promise<Candidate | null> {
	const { fallback, prompt } = ROLES[role];
	const byArea = (a: Candidate, b: Candidate) => b.area - a.area;
	const [direct] = (await find(prompt)).sort(byArea);
	if (direct) {
		return direct;
	}
	const people = (await find(PEOPLE)).sort(byArea);
	return fallback === "smallest"
		? (people.at(-1) ?? null)
		: (people[0] ?? null);
}

export interface MuseImageResult {
	bytes: Uint8Array;
	model: string;
	ms: number;
}

export interface ImageEditingConfig {
	apiKey?: string;
}

export function createImageEditing(config: ImageEditingConfig) {
	const { apiKey } = config;

	function headers() {
		if (!apiKey) {
			throw new Error("Meta Model API key is not set");
		}
		return {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		};
	}

	async function museImage(
		path: "edits" | "generations",
		input: {
			images?: { image_url: string }[];
			prompt: string;
			safetyId: string;
			size: string;
		}
	): Promise<MuseImageResult> {
		const started = Date.now();
		const response = await fetch(`${BASE_URL}/images/${path}`, {
			body: JSON.stringify({
				images: input.images,
				model: MUSE_IMAGE_MODEL,
				n: 1,
				output_format: "png",
				prompt: input.prompt,
				reasoning_strength: "low",
				response_format: "b64_json",
				size: input.size,
				user: input.safetyId,
			}),
			headers: headers(),
			method: "POST",
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		if (!response.ok) {
			throw new Error(
				`Muse Image ${response.status}: ${await response.text()}`
			);
		}
		const json = (await response.json()) as {
			data?: { b64_json?: string }[];
		};
		const b64 = json.data?.[0]?.b64_json;
		if (!b64) {
			throw new Error("Muse Image returned no image");
		}
		return {
			bytes: new Uint8Array(Buffer.from(b64, "base64")),
			model: MUSE_IMAGE_MODEL,
			ms: Date.now() - started,
		};
	}

	/**
	 * Edits up to 6 reference images with a prompt at the given size.
	 * `safetyId` is an opaque, stable id of the grown-up (never an email).
	 */
	function edit(input: {
		images: string[];
		prompt: string;
		safetyId: string;
		size: string;
	}): Promise<MuseImageResult> {
		if (input.images.length > MAX_REFERENCES) {
			return Promise.reject(
				new Error(`Muse Image takes at most ${MAX_REFERENCES} references`)
			);
		}
		return museImage("edits", {
			// The JSON body wants objects; a bare url string is rejected.
			images: input.images.map((image_url) => ({ image_url })),
			prompt: input.prompt,
			safetyId: input.safetyId,
			size: input.size,
		});
	}

	/** Every SAM match for `prompt`, each with its mask area. */
	async function findMasks(
		imageUrl: string,
		prompt: string
	): Promise<Candidate[]> {
		const response = await fetch(`${BASE_URL}/responses`, {
			body: JSON.stringify({
				input: [
					{
						content: [
							{ text: prompt, type: "input_text" },
							{ image_url: imageUrl, type: "input_image" },
						],
						role: "user",
						type: "message",
					},
				],
				metadata: { mask_encoding: "one_bit" },
				model: SAM_MODEL,
				stream: true,
			}),
			headers: headers(),
			method: "POST",
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		if (!(response.ok && response.body)) {
			throw new Error(`SAM ${response.status}: ${await response.text()}`);
		}
		const { outcome, records } = await parseImageStream(
			sseEvents(response.body) as AsyncIterable<ResponsesEvent>
		).finalResult;
		if (outcome.status !== "completed") {
			throw new Error(`SAM did not complete: ${JSON.stringify(outcome)}`);
		}
		return recordsOfKind(records, "mask").map((record) => {
			const mask = decodeMaskToRaster(record.mask);
			return {
				area: mask.reduce((sum, v) => sum + (v ? 1 : 0), 0),
				box: {
					x1: record.bounds.left,
					x2: record.bounds.right,
					y1: record.bounds.top,
					y2: record.bounds.bottom,
				},
				mask,
				maskHeight: record.mask.height,
				maskWidth: record.mask.width,
			};
		});
	}

	return {
		edit,
		/** Plain text-to-image at the given size. */
		generate(input: {
			prompt: string;
			safetyId: string;
			size: string;
		}): Promise<MuseImageResult> {
			return museImage("generations", input);
		},
		/** Whether a key is set. Tells a key-less env from a real failure. */
		isConfigured: Boolean(apiKey),

		/**
		 * Redraws one photo from a prompt. Returns PNG bytes.
		 * `safetyId` is an opaque, stable id of the grown-up (never an email).
		 */
		async redraw(input: {
			imageUrl: string;
			prompt: string;
			safetyId: string;
		}): Promise<Uint8Array> {
			const { bytes } = await edit({
				images: [input.imageUrl],
				prompt: input.prompt,
				safetyId: input.safetyId,
				size: "1024x1024",
			});
			return bytes;
		},

		/**
		 * The person for `role` in the image, or null when SAM finds none. A photo
		 * may show a child and a grown-up together: see `pickPerson`. It can take
		 * two SAM requests, so `track` wraps each one (the caller records its cost).
		 */
		segment(
			imageUrl: string,
			role: PersonRole,
			track: Track = (call) => call()
		): Promise<Found | null> {
			return pickPerson(role, (prompt) =>
				track(() => findMasks(imageUrl, prompt))
			);
		},
	};
}

export type ImageEditing = ReturnType<typeof createImageEditing>;
