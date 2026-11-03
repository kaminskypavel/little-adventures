// A place is a small lesson: a child question, answered by the place's fact. These rules decide
// what each screen says. Without a question (older adventures, intro, goodnight) the place keeps
// its name, as before.
import { PLACES } from "./map-rules";
import type { Adventure, NarrationAudio, NodeId, Place } from "./types";

type Lesson = Pick<Place, "fact" | "name" | "question">;

export interface MapLabel {
	kind: "answer" | "name" | "question";
	text: string;
}

/** The pill under a place on the map: its question before the visit, its answer after. */
export function mapLabel(place: Lesson, visited: boolean): MapLabel {
	const question = place.question?.trim();
	if (!question) {
		return { kind: "name", text: place.name };
	}
	const answer = place.fact.trim();
	if (visited && answer) {
		return { kind: "answer", text: answer };
	}
	return { kind: "question", text: question };
}

/** The label of a way on Pick a way: the question, else the name. */
export const choiceLabel = (place: Lesson): string =>
	place.question?.trim() || place.name;

export interface Learned {
	answer: string;
	node: NodeId;
	question: string;
}

/** What the child learned, one row per place that has both a question and its answer. */
export const learnedRows = (adventure: Adventure): Learned[] =>
	PLACES.flatMap((node) => {
		const { fact, question } = adventure.places[node];
		return question && fact ? [{ answer: fact, node, question }] : [];
	});

/**
 * What a place opens with. A place asks its own question with its narrator audio; the intro asks
 * its own question when the engine gives one (with its audio), else the adventure's big question,
 * silent. The goodnight scene asks nothing.
 */
export function openingOf(
	adventure: Adventure | null,
	node: NodeId
): { audio: NarrationAudio | null; question: string | null } {
	if (!adventure || node === "outro") {
		return { audio: null, question: null };
	}
	const place = adventure.places[node];
	const own = place.question?.trim();
	if (own) {
		return { audio: place.questionAudio ?? null, question: own };
	}
	return {
		audio: null,
		question: node === "intro" ? adventure.question : null,
	};
}

const LETTER_PX = 14.5;
const GAP_PX = 15;
/** About how wide a line of the question balloon may run (30 pt Nunito 900). */
const LINE_PX = 420;

/**
 * Where each line of a question starts, so the lines come out about equal (React Native has no
 * balanced wrapping). Widths are estimated from letter counts: close, not exact. A tie breaks toward the longer first line.
 */
export function balanceLines(words: string[]): number[] {
	const widths = words.map((w) => w.length * LETTER_PX + GAP_PX);
	const total = widths.reduce((sum, w) => sum + w, 0) - GAP_PX;
	const lines = Math.max(1, Math.ceil(total / LINE_PX));
	const target = total / lines;
	const starts = [0];
	let run = 0;
	for (const [index, width] of widths.entries()) {
		if (index > 0 && starts.length < lines && run + width * 0.4 > target) {
			starts.push(index);
			run = 0;
		}
		run += width;
	}
	return starts;
}
