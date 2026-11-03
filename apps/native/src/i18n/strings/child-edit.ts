import { defineStrings } from "@/src/i18n";

export const childEditStrings = defineStrings({
	en: {
		changePhoto: "Change {name}'s photo",
		confirmBody:
			"The profile and the past adventures of {name} will be hidden, and no new adventures can be made for {name}.",
		confirmDelete: "Delete",
		confirmTitle: "Delete {name}'s profile?",
		delete: "Delete {name}'s profile",
		done: "Done",
	},
	es: {
		changePhoto: "Cambiar la foto de {name}",
		confirmBody:
			"El perfil y las aventuras anteriores de {name} se ocultarán, y ya no se podrán crear aventuras nuevas para {name}.",
		confirmDelete: "Eliminar",
		confirmTitle: "¿Eliminar el perfil de {name}?",
		delete: "Eliminar el perfil de {name}",
		done: "Listo",
	},
	he: {
		changePhoto: "החלפת התמונה של {name}",
		confirmBody:
			"הפרופיל וההרפתקאות הקודמות של {name} יוסתרו, ואי אפשר יהיה ליצור הרפתקאות חדשות עבור {name}.",
		confirmDelete: "מחיקה",
		confirmTitle: "למחוק את הפרופיל של {name}?",
		delete: "מחיקת הפרופיל של {name}",
		done: "סיום",
	},
});
