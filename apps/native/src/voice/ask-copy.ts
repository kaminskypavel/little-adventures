import type { StarTakeName } from "@little-adventures/native-ui/star-take";
import type { VoiceHaloState } from "@little-adventures/native-ui/voice-halo";
import type { askStrings } from "@/src/i18n/strings/ask";

/** The ask screen's `t` from `useT(askStrings)`. */
export type AskT = (key: keyof typeof askStrings.en) => string;

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

export function titleFor(t: AskT, state: VoiceHaloState, hint: Hint): string {
	switch (state) {
		case "recording":
			return t("listening");
		case "thinking":
			return t("thinking");
		case "missed":
			return hint === "notQuestion" ? t("notQuestion") : t("missed");
		default:
			return t("ready");
	}
}

/** Thinking has no hint line: the star and the bubbles say it. */
export function lineFor(t: AskT, state: VoiceHaloState, hint: Hint): string {
	switch (state) {
		case "recording":
			return t("letGo");
		case "thinking":
			return "";
		case "missed":
			return hint === "notQuestion" ? t("holdAskQuestion") : t("holdAskAgain");
		default:
			return hint === "short" ? t("holdLonger") : t("holdAsk");
	}
}
