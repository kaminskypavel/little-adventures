// A place is a small lesson: a child question, answered by the place's fact. These rules decide
// what each screen says. Without a question (older adventures, intro, goodnight) the place keeps
// its name, as before.
import { PLACES } from "./map-rules";
import type { Adventure, NodeId, Place } from "./types";

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
