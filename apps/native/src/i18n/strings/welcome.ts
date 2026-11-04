import { defineStrings } from "@/src/i18n";

export const welcomeStrings = defineStrings({
	en: {
		getStarted: "Get started",
		guest: "Try as a guest",
		guestFailed: "The guest visit could not start. Please try again.",
		guestLabel: "Try as a guest, no account needed",
		haveAccount: "I have an account",
		tagline: "Stories that start with your child's curiosity",
	},
	es: {
		getStarted: "Empezar",
		guest: "Probar como invitado",
		guestFailed:
			"No se pudo empezar la visita de invitado. Inténtalo de nuevo.",
		guestLabel: "Probar como invitado, sin cuenta",
		haveAccount: "Ya tengo una cuenta",
		tagline: "Cuentos que nacen de la curiosidad de tu peque",
	},
	he: {
		getStarted: "בואו נתחיל",
		guest: "לנסות כאורחים",
		guestFailed: "אי אפשר היה להתחיל את ביקור האורחים. נסו שוב.",
		guestLabel: "לנסות כאורחים, בלי חשבון",
		haveAccount: "יש לי חשבון",
		tagline: "סיפורים שנולדים מהסקרנות של הילדים שלכם",
	},
});
