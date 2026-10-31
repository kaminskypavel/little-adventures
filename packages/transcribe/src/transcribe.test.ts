import { afterEach, describe, expect, test } from "bun:test";

import { createTranscription, readWav } from "./index";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

/** A WAV file: a fmt chunk, optional extra chunks (as iOS writes), then the data chunk. */
function wav(options: {
	channels?: number;
	extraChunk?: string;
	rate?: number;
	seconds: number;
}): Uint8Array {
	const channels = options.channels ?? 1;
	const rate = options.rate ?? 16_000;
	const dataSize = Math.round(options.seconds * rate) * channels * 2;
	const extra = options.extraChunk ? 8 + 4 : 0;
	const bytes = new Uint8Array(12 + 24 + extra + 8 + dataSize);
	const view = new DataView(bytes.buffer);
	const tag = (offset: number, text: string) => {
		for (const [i, char] of [...text].entries()) {
			bytes[offset + i] = char.charCodeAt(0);
		}
	};
	tag(0, "RIFF");
	view.setUint32(4, bytes.length - 8, true);
	tag(8, "WAVE");
	tag(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, rate * channels * 2, true);
	view.setUint16(32, channels * 2, true);
	view.setUint16(34, 16, true);
	let at = 36;
	if (options.extraChunk) {
		tag(at, options.extraChunk);
		view.setUint32(at + 4, 4, true);
		at += extra;
	}
	tag(at, "data");
	view.setUint32(at + 4, dataSize, true);
	return bytes;
}

function mockFetch(reply: () => Response) {
	const calls: { body: FormData; url: string }[] = [];
	globalThis.fetch = ((url: string, init: RequestInit) => {
		calls.push({ body: init.body as FormData, url });
		return Promise.resolve(reply());
	}) as unknown as typeof fetch;
	return calls;
}

const ok = () =>
	Response.json({ audioDurationMs: 2000, transcript: "why is the sky blue" });
const client = createTranscription({ apiKey: "k" });

describe("transcribe", () => {
	test("a valid WAV returns the text, model and seconds from one multipart request", async () => {
		const calls = mockFetch(ok);
		const result = await client.transcribe({
			audio: wav({ seconds: 2 }),
			safetyId: "abc",
		});
		expect(result).toMatchObject({
			model: "muse-voice-transcribe-1.0",
			seconds: 2,
			text: "why is the sky blue",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toStartWith("https://api.meta.ai/v1/asr/transcribe");
		const form = calls[0]?.body;
		expect(form?.get("audio")).toBeInstanceOf(Blob);
		const settings = form?.get("request") as Blob;
		expect(await settings.text()).toContain('"audioEncoding":"WAV"');
	});

	test("a WAV with an extra chunk before the data is accepted", async () => {
		mockFetch(ok);
		const bytes = wav({ extraChunk: "FLLR", seconds: 1 });
		expect(readWav(bytes).seconds).toBe(1);
		const result = await client.transcribe({ audio: bytes, safetyId: "abc" });
		expect(result.text).toBe("why is the sky blue");
	});

	test("a non-WAV, stereo or wrong-rate file is rejected before any request", async () => {
		const calls = mockFetch(ok);
		const bad = [
			new TextEncoder().encode("not audio at all, just some text bytes"),
			wav({ channels: 2, seconds: 1 }),
			wav({ rate: 24_000, seconds: 1 }),
		];
		const results = await Promise.allSettled(
			bad.map((audio) => client.transcribe({ audio, safetyId: "abc" }))
		);
		expect(results.map((r) => r.status)).toEqual([
			"rejected",
			"rejected",
			"rejected",
		]);
		expect(calls).toHaveLength(0);
	});

	test("a failed Meta call throws with the status", async () => {
		mockFetch(() => new Response("busy", { status: 429 }));
		await expect(
			client.transcribe({ audio: wav({ seconds: 1 }), safetyId: "abc" })
		).rejects.toThrow("429");
	});
});
