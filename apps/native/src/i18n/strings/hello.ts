import { defineStrings } from "@/src/i18n";

export const helloStrings = defineStrings({
	en: {
		addChild: "Add your child",
		caption: "About a minute:\na name and a photo.",
		line: "Let's make your child the hero of tonight's story.",
		signOut: "Sign out",
		welcome: "Welcome!",
		welcomeBack: "Welcome back, {name}!",
		welcomeName: "Welcome, {name}!",
	},
	he: {
		addChild: "הוספת ילד או ילדה",
		caption: "בערך דקה אחת:\nשם ותמונה.",
		line: "בואו נכניס את הילדים שלכם אל הסיפור של הערב.",
		signOut: "התנתקות",
		welcome: "ברוכים הבאים!",
		welcomeBack: "ברוכים השבים, {name}!",
		welcomeName: "ברוכים הבאים, {name}!",
	},
});
