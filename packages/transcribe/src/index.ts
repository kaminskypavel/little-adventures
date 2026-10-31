/**
 * Meta's Model API: Muse Voice Transcribe 1.0 turns a spoken clip into text.
 * Plain `fetch`, no retries (a retry is billed again). The key is injected by
 * the app; this package reads no env.
 *
 * Calls throw on any failure; the caller decides what that means.
 */

const DEFAULT_BASE_URL = "https://api.meta.ai/v1";
const MODEL = "muse-voice-transcribe-1.0";
const REQUEST_TIMEOUT_MS = 60_000;

const SAMPLE_RATE = 16_000;
const CHANNELS = 1;
const BITS = 16;
const PCM = 1;
const RIFF_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const FMT_MIN_BYTES = 16;

/** Muse Voice Transcribe: $0.18 per hour of audio, in micro-USD per second. */
export const TRANSCRIBE_COST_MICRO_USD_PER_SECOND = 50;

export const MODELS = { transcribe: MODEL } as const;

const tagAt = (view: DataView, offset: number) =>
	String.fromCharCode(
		view.getUint8(offset),
		view.getUint8(offset + 1),
		view.getUint8(offset + 2),
		view.getUint8(offset + 3)
	);

/**
 * Walks the RIFF chunks (iOS puts extra chunks before `data`, so no fixed
 * offsets), checks mono 16-bit PCM at 16 kHz and returns the length in seconds.
 * Throws on anything the model API would reject.
 */
export function readWav(audio: Uint8Array): { seconds: number } {
	const view = new DataView(audio.buffer, audio.byteOffset, audio.byteLength);
	if (
		audio.byteLength < RIFF_HEADER_BYTES ||
		tagAt(view, 0) !== "RIFF" ||
		tagAt(view, 8) !== "WAVE"
	) {
		throw new Error("Audio is not a WAV file");
	}
	let formatOk = false;
	let offset = RIFF_HEADER_BYTES;
	while (offset + CHUNK_HEADER_BYTES <= audio.byteLength) {
		const id = tagAt(view, offset);
		const size = view.getUint32(offset + 4, true);
		const body = offset + CHUNK_HEADER_BYTES;
		if (id === "fmt " && size >= FMT_MIN_BYTES) {
			formatOk =
				view.getUint16(body, true) === PCM &&
				view.getUint16(body + 2, true) === CHANNELS &&
				view.getUint32(body + 4, true) === SAMPLE_RATE &&
				view.getUint16(body + 14, true) === BITS;
			if (!formatOk) {
				break;
			}
		} else if (id === "data") {
			if (!formatOk) {
				break;
			}
			// A recorder that was cut off may write a size past the file end.
			const bytes = Math.min(size, audio.byteLength - body);
			return { seconds: bytes / (SAMPLE_RATE * CHANNELS * (BITS / 8)) };
		}
		// Chunks are padded to an even size.
		offset = body + size + (size % 2);
	}
	throw new Error("Audio must be mono 16-bit PCM WAV at 16 kHz");
}

export interface TranscriptionConfig {
	apiKey?: string;
	baseUrl?: string;
}

export function createTranscription(config: TranscriptionConfig) {
	const { apiKey, baseUrl = DEFAULT_BASE_URL } = config;

	return {
		/** Whether a key is set. Tells a key-less env from a real failure. */
		isConfigured: Boolean(apiKey),

		/**
		 * Transcribes one WAV clip. `safetyId` is an opaque, stable id of the
		 * grown-up (never an email); it rides along as the correlation id.
		 */
		async transcribe(input: { audio: Uint8Array; safetyId: string }) {
			const { seconds } = readWav(input.audio);
			if (!apiKey) {
				throw new Error("Meta Model API key is not set");
			}
			const form = new FormData();
			form.append(
				"request",
				new Blob(
					[
						JSON.stringify({
							audioEncoding: "WAV",
							mode: "PUSH_TO_TALK",
							model: MODEL,
						}),
					],
					{ type: "application/json" }
				)
			);
			form.append(
				"audio",
				new Blob([input.audio as Uint8Array<ArrayBuffer>], {
					type: "audio/wav",
				}),
				"recording.wav"
			);
			const began = Date.now();
			const response = await fetch(
				`${baseUrl}/asr/transcribe?sessionId=${encodeURIComponent(`${input.safetyId}-${crypto.randomUUID()}`)}`,
				{
					body: form,
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					method: "POST",
					signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				}
			);
			if (!response.ok) {
				throw new Error(
					`Muse Voice Transcribe ${response.status}: ${await response.text()}`
				);
			}
			const json = (await response.json()) as { transcript?: string };
			if (typeof json.transcript !== "string") {
				throw new Error("Muse Voice Transcribe returned no transcript");
			}
			return {
				model: MODEL,
				ms: Date.now() - began,
				seconds,
				text: json.transcript,
			};
		},
	};
}

export type Transcription = ReturnType<typeof createTranscription>;
