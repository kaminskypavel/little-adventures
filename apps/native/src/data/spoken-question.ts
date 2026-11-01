// The question the child just asked, kept in memory between the listening and check screens so
// the child's words never travel in the page address (and so never land in browser history).
// The short version rides along: the check screen opens only once it is ready.
let spoken = "";
let spokenShort = "";

export const setSpokenQuestion = (question: string, short = "") => {
	spoken = question;
	spokenShort = short;
};

export const getSpokenQuestion = (): string => spoken;

export const getShortSpokenQuestion = (): string => spokenShort;
