import { defineStrings } from "@/src/i18n";

// The place player (app/place.tsx) and its cards (src/place-cards.tsx).
export const placeStrings = defineStrings({
	en: {
		asked: "{name} asked",
		backToMap: "Back to the map",
		goodnight: "Goodnight",
		gotIt: "Got it!",
		learned: "What we learned",
		moonGoodnight: "And the moon said goodnight, {name}.",
		pause: "Pause",
		play: "Play",
		playingOn: "Playing on {device}",
		playingOnTv: "Playing on the TV",
		tvGettingReady: "Getting ready for the TV",
	},
	es: {
		asked: "{name} preguntó",
		backToMap: "Volver al mapa",
		goodnight: "Buenas noches",
		gotIt: "¡Entendido!",
		learned: "Lo que aprendimos",
		moonGoodnight: "Y la luna dijo buenas noches, {name}.",
		pause: "Pausa",
		play: "Reproducir",
		playingOn: "Reproduciendo en {device}",
		playingOnTv: "Reproduciendo en la tele",
		tvGettingReady: "Preparando la tele",
	},
	he: {
		asked: "השאלה של {name}",
		backToMap: "חזרה למפה",
		goodnight: "לילה טוב",
		gotIt: "הבנו!",
		learned: "מה למדנו",
		moonGoodnight: "והירח אמר לילה טוב, {name}.",
		pause: "השהיה",
		play: "הפעלה",
		playingOn: "מנגן ב{device}",
		playingOnTv: "מנגן בטלוויזיה",
		tvGettingReady: "מתכוננים לטלוויזיה",
	},
});
