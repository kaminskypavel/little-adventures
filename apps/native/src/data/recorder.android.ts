// Android: MediaRecorder cannot write WAV, so the local `wav-recorder` module (modules/) reads the
// microphone with AudioRecord and writes the 16 kHz mono 16-bit WAV the server takes.
import { requireNativeModule } from "expo";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	levelFromDb,
	MAX_RECORD_MS,
	METER_MS,
	type Recorder,
	SAMPLE_RATE,
} from "./voice-rules";

const WavRecorder = requireNativeModule<{
	level: () => number;
	start: (sampleRate: number) => Promise<string>;
	stop: () => Promise<string>;
}>("WavRecorder");

export function useRecorder(): Recorder {
	const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const meter = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
	const [level, setLevel] = useState(0);

	const stopMeter = useCallback(() => {
		clearInterval(meter.current);
		setLevel(0);
	}, []);

	const start = useCallback(async (onLimit: () => void) => {
		await WavRecorder.start(SAMPLE_RATE);
		meter.current = setInterval(
			() => setLevel(levelFromDb(WavRecorder.level())),
			METER_MS
		);
		limit.current = setTimeout(onLimit, MAX_RECORD_MS);
	}, []);

	const stop = useCallback(async () => {
		clearTimeout(limit.current);
		stopMeter();
		const uri = await WavRecorder.stop();
		if (!uri) {
			return new Uint8Array(0);
		}
		return new Uint8Array(await (await fetch(uri)).arrayBuffer());
	}, [stopMeter]);

	useEffect(
		() => () => {
			clearTimeout(limit.current);
			clearInterval(meter.current);
			WavRecorder.stop().catch(() => undefined);
		},
		[]
	);

	return { level, start, stop };
}
