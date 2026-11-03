// Dev only: `?dev=questions` fills the moon adventure with questions and answers, no audio, so
// the screens can be seen before the engine sends them. A production build ignores it.
import { dev } from "../dev-param";
import type { Adventure } from "./types";

const MOON_ADVENTURE = "025d9e29-9225-4af7-aee4-e9807bbb4866";

// By place name, which is what the plates show.
const LESSONS: Record<string, { fact: string; question: string }> = {
	"Dark Part": {
		fact: "The dark part is still there.",
		question: "Where did the dark part go?",
	},
	"Moon Circle": {
		fact: "The moon goes around the Earth.",
		question: "Where does the moon go?",
	},
	"New Light": {
		fact: "We see a new lit part.",
		question: "Why do we see more moon?",
	},
	"Sun Light": {
		fact: "The sun shines light on the moon.",
		question: "Where does moonlight come from?",
	},
};

// A single-page app keeps its first address, so the flag is read once, as the page loads.
const requested =
	typeof location !== "undefined" &&
	new URLSearchParams(location.search).get("dev") === "questions";

/** The adventure with the fixture's questions in; any other adventure, or no flag, passes as it is. */
export function withDevQuestions(adventure: Adventure): Adventure {
	if (!(requested && dev(true)) || adventure.id !== MOON_ADVENTURE) {
		return adventure;
	}
	const places = Object.fromEntries(
		Object.entries(adventure.places).map(([id, place]) => [
			id,
			{ ...place, ...LESSONS[place.name] },
		])
	) as Adventure["places"];
	return { ...adventure, places };
}
