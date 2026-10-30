export type NodeId = "intro" | "p1" | "p2" | "p1a" | "p2a" | "outro";
/** Still being made, or playable. */
export type PlaceStatus = "drawing" | "ready";
export interface Place {
	/** e.g. "Moon dust keeps footprints". */
	fact: string;
	id: NodeId;
	/** Plate text, e.g. "Moon dust". */
	name: string;
	/** Words of the read-along line, in order. */
	narration: string[];
	/** require()'d image module, or null = neutral placeholder. */
	picture: number | null;
	status: PlaceStatus;
	/** require()'d video module, or null = show picture as the frame. */
	video: number | null;
}
/** e.g. "Goodnight moon", gate image, open image. */
export interface EndGoal {
	closed: number;
	name: string;
	open: number;
}
export interface Cast {
	childAge: number;
	childKind: "girl" | "boy";
	childName: string;
	grownUp: boolean;
	puppy: boolean;
}
export interface Adventure {
	cast: Cast;
	endGoal: EndGoal;
	id: string;
	places: Record<NodeId, Place>;
	/** e.g. "How do you get to the moon?". */
	question: string;
	/** e.g. "The Box That Flew". */
	title: string;
}
export interface Progress {
	here: NodeId;
	visited: NodeId[];
}
export interface AdventureSummary {
	finished: boolean;
	foundCount: number;
	id: string;
	partsDone: number;
	partsTotal: number;
	picture: number | null;
	title: string;
}
export interface Idea {
	picture: number;
	question: string;
}
export type MakeStatus =
	| { state: "making"; progress: number }
	| { state: "ready" }
	| { state: "failed" };

export type Look = "clay" | "felt" | "wood";
export interface Profile {
	childAge: number;
	childKind: "girl" | "boy";
	childName: string;
	grownUp: boolean;
	hasPhoto: boolean;
	look: Look;
	/** Storage key of the uploaded photo. */
	photoKey?: string;
	puppy: boolean;
}
