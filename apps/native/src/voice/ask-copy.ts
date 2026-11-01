import type { StarTakeName } from "@little-adventures/native-ui/star-take";
import type { VoiceHaloState } from "@little-adventures/native-ui/voice-halo";

export type Hint = "ask" | "missed" | "notQuestion" | "short";

export function haloState(
	pressing: boolean,
	thinking: boolean,
	hint: Hint
): VoiceHaloState {
	if (thinking) {
		return "thinking";
	}
	if (pressing) {
		return "recording";
	}
	return hint === "missed" || hint === "notQuestion" ? "missed" : "ready";
}

export function takeFor(pressing: boolean, thinking: boolean): StarTakeName {
	if (thinking) {
		return "think";
	}
	return pressing ? "listen" : "idle";
}

export function titleFor(state: VoiceHaloState, hint: Hint): string {
	switch (state) {
		case "recording":
			return "I'm listening...";
		case "thinking":
			return "Let me think...";
		case "missed":
			return hint === "notQuestion"
				? "That wasn't a question"
				: "I missed that";
		default:
			return "Ask me anything";
	}
}

/** Thinking has no hint line: the star and the bubbles say it. */
export function lineFor(state: VoiceHaloState, hint: Hint): string {
	switch (state) {
		case "recording":
			return "Let go when you're done";
		case "thinking":
			return "";
		case "missed":
			return hint === "notQuestion"
				? "Hold the button and ask a question"
				: "Hold the button and ask again";
		default:
			return hint === "short"
				? "Hold a little longer"
				: "Hold the button and ask";
	}
}
