// The browser's recorder gives webm or mp4. Decoding in an AudioContext made at 16 kHz makes the
// browser resample, then the audio is mixed to mono and written as WAV.
import { useCallback, useEffect, useRef, useState } from "react";
import {
	levelFromDb,
	MAX_RECORD_MS,
	METER_MS,
	type Recorder,
	SAMPLE_RATE,
} from "./voice-rules";
import { encodeWav, toMono } from "./wav";

async function toWav(blob: Blob): Promise<Uint8Array> {
	if (blob.size === 0) {
		return new Uint8Array(0);
	}
	const context = new AudioContext({ sampleRate: SAMPLE_RATE });
	try {
		const audio = await context.decodeAudioData(await blob.arrayBuffer());
		const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
			audio.getChannelData(i)
		);
		return encodeWav(toMono(channels), SAMPLE_RATE);
	} finally {
		context.close();
	}
}

const FFT_SIZE = 1024;
const SILENCE = 1e-6;

/** Reads the microphone stream's loudness (RMS in dB) into `onLevel`; the returned function stops it. */
function meterStream(
	stream: MediaStream,
	onLevel: (level: number) => void
): () => void {
	const context = new AudioContext();
	const analyser = context.createAnalyser();
	analyser.fftSize = FFT_SIZE;
	context.createMediaStreamSource(stream).connect(analyser);
	const samples = new Float32Array(analyser.fftSize);
	const timer = setInterval(() => {
		analyser.getFloatTimeDomainData(samples);
		let sum = 0;
		for (const sample of samples) {
			sum += sample * sample;
		}
		const rms = Math.sqrt(sum / samples.length);
		onLevel(levelFromDb(20 * Math.log10(Math.max(rms, SILENCE))));
	}, METER_MS);
	let open = true;
	return () => {
		if (!open) {
			return;
		}
		open = false;
		clearInterval(timer);
		context.close();
		onLevel(0);
	};
}

export function useRecorder(): Recorder {
	const media = useRef<MediaRecorder | null>(null);
	const chunks = useRef<Blob[]>([]);
	const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const alive = useRef<boolean>(true);
	const unmeter = useRef<() => void>(() => undefined);
	const [level, setLevel] = useState(0);

	const start = useCallback(async (onLimit: () => void) => {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		// The child left while the browser was asking: let go of the microphone at once.
		if (!alive.current) {
			for (const track of stream.getTracks()) {
				track.stop();
			}
			return;
		}
		const next = new MediaRecorder(stream);
		chunks.current = [];
		next.ondataavailable = (event) => chunks.current.push(event.data);
		next.start();
		media.current = next;
		unmeter.current = meterStream(stream, setLevel);
		limit.current = setTimeout(onLimit, MAX_RECORD_MS);
	}, []);

	const stop = useCallback(async () => {
		clearTimeout(limit.current);
		unmeter.current();
		const { current } = media;
		media.current = null;
		if (!current || current.state === "inactive") {
			return new Uint8Array(0);
		}
		const done = new Promise<void>((resolve) => {
			current.onstop = () => resolve();
		});
		current.stop();
		await done;
		for (const track of current.stream.getTracks()) {
			track.stop();
		}
		return toWav(new Blob(chunks.current, { type: current.mimeType }));
	}, []);

	// Leaving the screen lets go of the microphone.
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			clearTimeout(limit.current);
			unmeter.current();
			for (const track of media.current?.stream.getTracks() ?? []) {
				track.stop();
			}
		};
	}, []);

	return { level, start, stop };
}
