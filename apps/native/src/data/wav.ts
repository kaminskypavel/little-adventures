// Mono 16-bit PCM WAV: what the app server's transcription accepts (16 kHz, up to 30 s).
const HEADER = 44;
const BYTES_PER_SAMPLE = 2;
const FULL_SCALE = 0x80_00;
const CHUNK_HEAD = 8;
const RIFF_HEAD = 12;
const BASE64_SLICE = 0x80_00;

const writeText = (view: DataView, at: number, value: string) => {
	for (const [i, char] of [...value].entries()) {
		view.setUint8(at + i, char.charCodeAt(0));
	}
};

/** Float samples (-1 to 1) at `sampleRate` as a mono 16-bit PCM WAV. Louder samples clamp. */
export function encodeWav(
	samples: Float32Array,
	sampleRate: number
): Uint8Array {
	const dataSize = samples.length * BYTES_PER_SAMPLE;
	const out = new Uint8Array(HEADER + dataSize);
	const view = new DataView(out.buffer);
	writeText(view, 0, "RIFF");
	view.setUint32(4, HEADER - CHUNK_HEAD + dataSize, true);
	writeText(view, 8, "WAVE");
	writeText(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true);
	view.setUint16(32, BYTES_PER_SAMPLE, true);
	view.setUint16(34, 16, true);
	writeText(view, 36, "data");
	view.setUint32(40, dataSize, true);
	samples.forEach((s, i) => {
		const clamped = Math.max(-1, Math.min(1, s));
		const int = clamped < 0 ? clamped * FULL_SCALE : clamped * (FULL_SCALE - 1);
		view.setInt16(HEADER + i * BYTES_PER_SAMPLE, Math.trunc(int), true);
	});
	return out;
}

/** The size of the audio in a WAV file. Walks the chunks: files from iOS carry extras before it. */
export function wavDataSize(wav: Uint8Array): number {
	const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
	let at = RIFF_HEAD;
	while (at + CHUNK_HEAD <= wav.length) {
		const size = view.getUint32(at + 4, true);
		const name = String.fromCharCode(...wav.slice(at, at + 4));
		if (name === "data") {
			return Math.min(size, wav.length - at - CHUNK_HEAD);
		}
		at += CHUNK_HEAD + size + (size % 2);
	}
	return 0;
}

/** One channel from many, by averaging. */
export function toMono(channels: Float32Array[]): Float32Array {
	const [first] = channels;
	if (!first) {
		return new Float32Array(0);
	}
	return first.map(
		(_, i) =>
			channels.reduce((sum, c) => sum + (c[i] ?? 0), 0) / channels.length
	);
}

/** Base64 for the tRPC body. Built in slices so a large file never overflows the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += BASE64_SLICE) {
		binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_SLICE));
	}
	return btoa(binary);
}
