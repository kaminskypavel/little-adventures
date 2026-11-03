import { defineStrings } from "@/src/i18n";

export const photoStrings = defineStrings({
	en: {
		cameraOff: "Camera is off. Choose a photo instead.",
		choose: "Choose a photo",
		line: "Only used to draw storybook {name}. Never shown or shared.",
		take: "Take a photo",
		title: "Photo time",
		uploadFailed: "That did not upload. Try again.",
	},
	he: {
		cameraOff: "המצלמה כבויה. אפשר לבחור תמונה במקום.",
		choose: "לבחור תמונה",
		line: "התמונה משמשת רק כדי לצייר את {name} בסגנון ספר סיפורים. היא לעולם לא מוצגת ולא משותפת.",
		take: "לצלם תמונה",
		title: "זמן תמונה",
		uploadFailed: "ההעלאה לא הצליחה. נסו שוב.",
	},
});
