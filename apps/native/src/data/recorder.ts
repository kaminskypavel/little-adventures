// Records a spoken question on the phone as 16 kHz mono 16-bit WAV, the form the server takes.
import {
	AudioQuality,
	IOSOutputFormat,
	type RecordingOptions,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	levelFromDb,
	MAX_RECORD_MS,
	METER_MS,
	type Recorder,
	SAMPLE_RATE,
} from "./voice-rules";

const options: RecordingOptions = {
	...RecordingPresets.HIGH_QUALITY,
	extension: ".wav",
	ios: {
		audioQuality: AudioQuality.MAX,
		extension: ".wav",
		linearPCMBitDepth: 16,
		linearPCMIsBigEndian: false,
		linearPCMIsFloat: false,
		outputFormat: IOSOutputFormat.LINEARPCM,
		sampleRate: SAMPLE_RATE,
	},
	isMeteringEnabled: true,
	numberOfChannels: 1,
	sampleRate: SAMPLE_RATE,
};

export function useRecorder(): Recorder {
	const recorder = useAudioRecorder(options);
	const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const meter = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
	const [level, setLevel] = useState(0);

	const stopMeter = useCallback(() => {
		clearInterval(meter.current);
		setLevel(0);
	}, []);

	const start = useCallback(
		async (onLimit: () => void) => {
			await setAudioModeAsync({
				allowsRecording: true,
				playsInSilentMode: true,
			});
			await recorder.prepareToRecordAsync();
			recorder.record();
			meter.current = setInterval(
				() => setLevel(levelFromDb(recorder.getStatus().metering)),
				METER_MS
			);
			limit.current = setTimeout(onLimit, MAX_RECORD_MS);
		},
		[recorder]
	);

	const stop = useCallback(async () => {
		clearTimeout(limit.current);
		stopMeter();
		await recorder.stop();
		await setAudioModeAsync({ allowsRecording: false });
		if (!recorder.uri) {
			return new Uint8Array(0);
		}
		return new Uint8Array(await (await fetch(recorder.uri)).arrayBuffer());
	}, [recorder, stopMeter]);

	useEffect(
		() => () => {
			clearTimeout(limit.current);
			clearInterval(meter.current);
		},
		[]
	);

	return { level, start, stop };
}
