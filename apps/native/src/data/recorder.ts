// Records a spoken question on the phone as 16 kHz mono 16-bit WAV, the form the server takes.
import {
	AudioQuality,
	IOSOutputFormat,
	type RecordingOptions,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { MAX_RECORD_MS } from "./voice-rules";

const SAMPLE_RATE = 16_000;

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
	numberOfChannels: 1,
	sampleRate: SAMPLE_RATE,
};

export interface Recorder {
	/** Starts recording; `onLimit` fires if the child talks to the 30 s limit. */
	start: (onLimit: () => void) => Promise<void>;
	/** Stops and returns the WAV file's bytes. */
	stop: () => Promise<Uint8Array>;
}

export function useRecorder(): Recorder {
	const recorder = useAudioRecorder(options);
	const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const start = useCallback(
		async (onLimit: () => void) => {
			await setAudioModeAsync({
				allowsRecording: true,
				playsInSilentMode: true,
			});
			await recorder.prepareToRecordAsync();
			recorder.record();
			limit.current = setTimeout(onLimit, MAX_RECORD_MS);
		},
		[recorder]
	);

	const stop = useCallback(async () => {
		clearTimeout(limit.current);
		await recorder.stop();
		await setAudioModeAsync({ allowsRecording: false });
		if (!recorder.uri) {
			return new Uint8Array(0);
		}
		return new Uint8Array(await (await fetch(recorder.uri)).arrayBuffer());
	}, [recorder]);

	useEffect(() => () => clearTimeout(limit.current), []);

	return { start, stop };
}
