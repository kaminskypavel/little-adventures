import type { EngineSteps } from "@/src/data/engine-client";

const STEP_NAMES: [keyof EngineSteps, string][] = [
	["story", "story"],
	["pictures", "pictures"],
	["voice", "voice"],
	["video", "video"],
];

/** "Real calls: story, pictures, voice. Off: video." from the admin's step switches. */
export function stepsLine(steps: EngineSteps): string {
	const on = STEP_NAMES.filter(([key]) => steps[key]).map(([, name]) => name);
	const off = STEP_NAMES.filter(([key]) => !steps[key]).map(([, name]) => name);
	const parts = [
		on.length > 0 ? `Real calls: ${on.join(", ")}.` : "",
		off.length > 0 ? `Off: ${off.join(", ")}.` : "",
	];
	return parts.filter(Boolean).join(" ");
}
