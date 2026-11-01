export type NodeId = "intro" | "p1" | "p2" | "p1a" | "p2a" | "outro";
/** Still being made, or playable. */
export type PlaceStatus = "drawing" | "ready";
/** A bundled image module, or a picture from the engine: `cacheKey` is its storage key. */
export type Picture = number | { cacheKey?: string; uri: string };
/** One spoken word and when it is said, in seconds from the start of the narration. */
export interface WordTiming {
	endSec: number;
	startSec: number;
	text: string;
}
export interface NarrationAudio {
	url: string;
	words: WordTiming[];
}
export interface Place {
	/** The spoken narration with its word timings. Absent for the bundled adventure. */
	audio?: NarrationAudio | null;
	/** e.g. "Moon dust keeps footprints". */
	fact: string;
	id: NodeId;
	/** Plate text, e.g. "Moon dust". */
	name: string;
	/** Words of the read-along line, in order. */
	narration: string[];
	/** An image, or null = neutral placeholder. */
	picture: Picture | null;
	status: PlaceStatus;
	/** require()'d video module or a video url, or null = show picture as the frame. */
	video: number | string | null;
}
/** e.g. "Goodnight moon", gate image, open image. The pictures are null until they are made. */
export interface EndGoal {
	closed: Picture | null;
	name: string;
	open: Picture | null;
}
export interface Adventure {
	endGoal: EndGoal;
	id: string;
	places: Record<NodeId, Place>;
	/** Seconds until the next read while any place is still being made. Absent or null: all done. */
	pollAfterSec?: number | null;
	/** e.g. "How do you get to the moon?". */
	question: string;
	/** "recorded" is a sample adventure, not made for this question. Absent: the bundled one. */
	source?: string;
	/** e.g. "The Box That Flew". */
	title: string;
}
export interface Progress {
	here: NodeId;
	/** From the engine: true while goodnight is locked. Absent: the map rules decide. */
	outroLocked?: boolean;
	visited: NodeId[];
}
export interface AdventureSummary {
	finished: boolean;
	foundCount: number;
	id: string;
	partsDone: number;
	partsTotal: number;
	picture: Picture | null;
	title: string;
}
export interface Idea {
	picture: number;
	question: string;
}
/**
 * `stage` (0 to 2) is the engine's own word on how far the making is; the bundled adventure
 * leaves it out and the screen goes by its bar. `goalName` appears once the end goal has a name.
 */
export type MakeStatus =
	| { goalName?: string; progress: number; stage?: number; state: "making" }
	| { goalName?: string; state: "ready" }
	| { state: "failed" };

export type Look = "clay";
/** State of the child's drawn art: idle (none started), working, ready or failed. */
export type ArtStatus = "idle" | "working" | "ready" | "failed";
export interface Profile {
	artStatus: ArtStatus;
	/** Null until the grown-up picks an age. */
	childAge: number | null;
	childKind: "girl" | "boy";
	childName: string;
	/** Signed url of the face cutout (transparent PNG), once drawn. */
	faceUrl?: string;
	grownUp: boolean;
	hasPhoto: boolean;
	look: Look;
	/** Storage key of the uploaded photo. */
	photoKey?: string;
	puppy: boolean;
}
