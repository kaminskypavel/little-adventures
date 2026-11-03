import { defineStrings } from "@/src/i18n";

// The star's ask screen: the title and the hint line under the hold button.
export const askStrings = defineStrings({
	en: {
		holdAsk: "Hold the button and ask",
		holdAskAgain: "Hold the button and ask again",
		holdAskQuestion: "Hold the button and ask a question",
		holdLonger: "Hold a little longer",
		letGo: "Let go when you're done",
		listening: "I'm listening...",
		missed: "I missed that",
		notQuestion: "That wasn't a question",
		ready: "Ask me anything",
		thinking: "Let me think...",
	},
	he: {
		holdAsk: "לוחצים על הכפתור ושואלים",
		holdAskAgain: "לוחצים על הכפתור ושואלים שוב",
		holdAskQuestion: "לוחצים על הכפתור ושואלים שאלה",
		holdLonger: "לוחצים עוד קצת",
		letGo: "מרפים כשמסיימים",
		listening: "מקשיבים...",
		missed: "לא שמעתי טוב",
		notQuestion: "זו לא הייתה שאלה",
		ready: "אפשר לשאול אותי הכול",
		thinking: "רגע, חושבים...",
	},
});
