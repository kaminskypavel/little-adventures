import { describe, expect, test } from "bun:test";
import { bytesToBase64, encodeWav, toMono, wavDataSize } from "./wav";

const HEADER = 44;
const view = (wav: Uint8Array) =>
	new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
const text = (wav: Uint8Array, at: number) =>
	String.fromCharCode(...wav.slice(at, at + 4));

describe("encodeWav", () => {
	test("a known buffer gets a 16 kHz, mono, 16-bit header and its data", () => {
		const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16_000);
		const v = view(wav);
		expect(text(wav, 0)).toBe("RIFF");
		expect(text(wav, 8)).toBe("WAVE");
		expect(text(wav, 12)).toBe("fmt ");
		expect(v.getUint16(20, true)).toBe(1); // PCM
		expect(v.getUint16(22, true)).toBe(1); // mono
		expect(v.getUint32(24, true)).toBe(16_000);
		expect(v.getUint32(28, true)).toBe(32_000); // bytes per second
		expect(v.getUint16(32, true)).toBe(2); // block align
		expect(v.getUint16(34, true)).toBe(16);
		expect(text(wav, 36)).toBe("data");
		expect(v.getUint32(40, true)).toBe(8);
		expect(v.getUint32(4, true)).toBe(wav.length - 8);
		expect(wav.length).toBe(HEADER + 8);
		expect(v.getInt16(HEADER + 2, true)).toBe(16_383);
		expect(v.getInt16(HEADER + 4, true)).toBe(-16_384);
	});

	test("samples past full scale clamp to the 16-bit range", () => {
		const wav = encodeWav(new Float32Array([2, -2]), 16_000);
		expect(view(wav).getInt16(HEADER, true)).toBe(32_767);
		expect(view(wav).getInt16(HEADER + 2, true)).toBe(-32_768);
	});

	test("an empty buffer is a header with a zero data size", () => {
		const wav = encodeWav(new Float32Array(0), 16_000);
		expect(wav.length).toBe(HEADER);
		expect(view(wav).getUint32(40, true)).toBe(0);
		expect(wavDataSize(wav)).toBe(0);
	});
});

describe("wavDataSize", () => {
	test("reads the data chunk past an extra chunk before it", () => {
		const plain = encodeWav(new Float32Array(3), 16_000);
		const extra = new Uint8Array([70, 76, 76, 82, 2, 0, 0, 0, 0, 0]); // "FLLR", 2 bytes
		const wav = new Uint8Array(plain.length + extra.length);
		wav.set(plain.slice(0, 36));
		wav.set(extra, 36);
		wav.set(plain.slice(36), 36 + extra.length);
		expect(wavDataSize(wav)).toBe(6);
	});
});

describe("toMono", () => {
	test("averages the channels", () => {
		const mono = toMono([new Float32Array([1, 0]), new Float32Array([0, 1])]);
		expect([...mono]).toEqual([0.5, 0.5]);
	});
});

describe("bytesToBase64", () => {
	test("matches the standard encoding", () => {
		const bytes = new Uint8Array(70_000).map((_, i) => i % 251);
		expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
	});
});
