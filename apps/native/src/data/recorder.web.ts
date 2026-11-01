// The browser's recorder gives webm or mp4. Decoding in an AudioContext made at 16 kHz makes the
// browser resample, then the audio is mixed to mono and written as WAV.
import { useCallback, useEffect, useRef } from "react";
import { MAX_RECORD_MS, type Recorder, SAMPLE_RATE } from "./voice-rules";
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

export function useRecorder(): Recorder {
	const media = useRef<MediaRecorder | null>(null);
	const chunks = useRef<Blob[]>([]);
	const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const start = useCallback(async (onLimit: () => void) => {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const next = new MediaRecorder(stream);
		chunks.current = [];
		next.ondataavailable = (event) => chunks.current.push(event.data);
		next.start();
		media.current = next;
		limit.current = setTimeout(onLimit, MAX_RECORD_MS);
	}, []);

	const stop = useCallback(async () => {
		clearTimeout(limit.current);
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
	useEffect(
		() => () => {
			clearTimeout(limit.current);
			for (const track of media.current?.stream.getTracks() ?? []) {
				track.stop();
			}
		},
		[]
	);

	return { start, stop };
}
