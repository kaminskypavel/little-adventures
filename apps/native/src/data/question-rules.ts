// A place is a small lesson: a child question, answered by the place's fact. These rules decide
// what each screen says. Without a question (older adventures, intro, goodnight) the place keeps
// its name, as before.
import { PLACES } from "./map-rules";
import type {
	Adventure,
	NarrationAudio,
	NodeId,
	Place,
	WordTiming,
} from "./types";

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

/** The place's lesson said again as it ends: the fact, and where the narrator says it, if they do. */
export interface LessonLine {
	/** The narrator's own words for the fact, cut from the place's audio; null when it is not said. */
	audio: {
		fromSec: number;
		toSec: number;
		url: string;
		words: WordTiming[];
	} | null;
	fact: string;
}

const NOT_A_LETTER = /[^\p{L}\p{N}]+/gu;
const plain = (word: string) => word.toLowerCase().replace(NOT_A_LETTER, "");

const SENTENCE_END = /[.!?]["')\u201d]*$/u;
/** A sentence that shares at least this share of the fact's words says the fact. */
const SAYS_FACT = 0.6;

/** The narration cut into its sentences, by the words that end in a full stop, ! or ?. */
function sentencesOf(words: WordTiming[]): WordTiming[][] {
	const out: WordTiming[][] = [[]];
	for (const word of words) {
		out.at(-1)?.push(word);
		if (SENTENCE_END.test(word.text)) {
			out.push([]);
		}
	}
	return out.filter((s) => s.length > 0);
}

/** The share of the fact's words a sentence says, in any order. */
function overlap(sentence: WordTiming[], fact: Set<string>): number {
	const said = new Set(sentence.map((w) => plain(w.text)));
	let shared = 0;
	for (const word of fact) {
		if (said.has(word)) {
			shared += 1;
		}
	}
	return shared / Math.max(fact.size, 1);
}

/**
 * What a place recaps as it ends: its fact (none for the intro, the goodnight and older
 * adventures), with the narrator's own sentence for it: the sentence of the place's narration (a
 * part's own audio or the shared one) that says most of the fact's words, if one says at least
 * 60% of them. The card shows that sentence, so the words lit are the words heard. Timed from 0.
 */
export function lessonOf(place: Place): LessonLine | null {
	const fact = place.fact.trim();
	if (!(fact && place.question?.trim())) {
		return null;
	}
	const wanted = new Set(fact.split(/\s+/u).map(plain).filter(Boolean));
	const audios = [
		...place.parts.flatMap((part) => (part.narration ? [part.narration] : [])),
		...(place.audio ? [place.audio] : []),
	];
	let best: { score: number; url: string; words: WordTiming[] } | null = null;
	for (const audio of audios) {
		for (const sentence of sentencesOf(audio.words)) {
			const score = overlap(sentence, wanted);
			if (score >= SAYS_FACT && score > (best?.score ?? 0)) {
				best = { score, url: audio.url, words: sentence };
			}
		}
	}
	if (best) {
		const fromSec = best.words[0].startSec;
		return {
			audio: {
				fromSec,
				toSec: best.words.at(-1)?.endSec ?? fromSec,
				url: best.url,
				words: best.words.map((w) => ({
					...w,
					endSec: w.endSec - fromSec,
					startSec: w.startSec - fromSec,
				})),
			},
			fact,
		};
	}
	return { audio: null, fact };
}
