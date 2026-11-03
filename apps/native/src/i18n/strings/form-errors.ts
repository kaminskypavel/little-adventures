import { defineStrings, useT } from "@/src/i18n";

// The shared validation package (the server uses it too) keeps its English messages; the app maps
// the ones it shows to the chosen language.
export const formErrorStrings = defineStrings({
	en: {
		addName: "Add a name.",
		badCode: "The code has 6 digits.",
		badEmail: "That email does not look right.",
		nameLong: "That name is a little long.",
		pickAge: "Pick an age.",
	},
	he: {
		addName: "הוסיפו שם.",
		badCode: "הקוד כולל 6 ספרות.",
		badEmail: "האימייל הזה לא נראה תקין.",
		nameLong: "השם הזה קצת ארוך.",
		pickAge: "בחרו גיל.",
	},
});

const KEYS = {
	"Add a name.": "addName",
	"Pick an age.": "pickAge",
	"That email does not look right.": "badEmail",
	"That name is a little long.": "nameLong",
	"The code has 6 digits.": "badCode",
} as const;

/** `errorText(fieldState.error?.message)`: the message in the chosen language (unknown ones as is). */
export function useErrorText() {
	const t = useT(formErrorStrings);
	return (message: string | undefined) => {
		if (!message) {
			return message;
		}
		const key = KEYS[message as keyof typeof KEYS];
		return key ? t(key) : message;
	};
}
