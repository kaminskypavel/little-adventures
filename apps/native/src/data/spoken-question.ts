// The question the child just asked, kept in memory between the listening and check screens so
// the child's words never travel in the page address (and so never land in browser history).
let spoken = "";

export const setSpokenQuestion = (question: string) => {
	spoken = question;
};

export const getSpokenQuestion = (): string => spoken;
