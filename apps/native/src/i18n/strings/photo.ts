import { defineStrings } from "@/src/i18n";

export const photoStrings = defineStrings({
	en: {
		cameraOff: "Camera is off. Choose a photo instead.",
		choose: "Choose a photo",
		line: "Only used to draw storybook {name}. Never shown or shared.",
		menuTitle: "{name}'s photo",
		photo: "Photo",
		remove: "Remove photo",
		take: "Take a photo",
		title: "Photo time",
		uploadFailed: "That did not upload. Try again.",
	},
	he: {
		cameraOff: "המצלמה כבויה. אפשר לבחור תמונה במקום.",
		choose: "לבחור תמונה",
		line: "התמונה משמשת רק כדי לצייר את {name} בסגנון ספר סיפורים. היא לעולם לא מוצגת ולא משותפת.",
		menuTitle: "התמונה של {name}",
		photo: "תמונה",
		remove: "הסרת התמונה",
		take: "לצלם תמונה",
		title: "זמן תמונה",
		uploadFailed: "ההעלאה לא הצליחה. נסו שוב.",
	},
});
