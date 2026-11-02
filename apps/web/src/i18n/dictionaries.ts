export const LOCALES = ["en", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export type SceneId =
	| "playroom"
	| "star"
	| "moon"
	| "saturn"
	| "ocean"
	| "dinosaurs"
	| "goodnight";

export interface Dictionary {
	badges: {
		appStore: string;
		comingSoon: string;
		googlePlay: string;
		joinWaitlist: string;
	};
	/** The scroll cue: "scroll" on computers, "swipe" on touch screens. */
	hint: { scroll: string; swipe: string };
	language: { label: string; name: string };
	loader: string;
	meta: {
		description: string;
		ogLocale: string;
		shareDescription: string;
		title: string;
	};
	quote: readonly [string, string];
	scenes: Record<SceneId, { line: string; question?: string; title?: string }>;
	waitlist: {
		body: string;
		close: string;
		done: string;
		emailLabel: string;
		error: string;
		invalid: string;
		submit: string;
		title: string;
	};
}

// Search and share text, kept inside what Google and social previews show in full:
// title up to 60 characters, share description up to 125, meta description up to 160.
// French punctuation takes a no-break space (written \u00A0) before : ? and inside « ».
// \u2060 (word joiner) after a hyphen keeps a big title from breaking there ("Aidez-" / "les").
export const dictionaries: Record<Locale, Dictionary> = {
	en: {
		badges: {
			appStore: "Download on the App Store",
			comingSoon: "Coming soon to iPhone and Android.",
			googlePlay: "Get it on Google Play",
			joinWaitlist: "(join the waitlist)",
		},
		hint: { scroll: "Scroll down", swipe: "Swipe down" },
		language: { label: "Language", name: "English" },
		loader: "Getting the adventure ready",
		meta: {
			description:
				"Your child asks a question out loud. A short illustrated story answers it, starring your child, with real facts and a calm goodnight.",
			ogLocale: "en_US",
			shareDescription:
				"Your child asks a question out loud. A short illustrated story answers it, starring your child, then says goodnight.",
			title: "Little Adventures: stories born from your child's curiosity",
		},
		quote: ["“", "”"],
		scenes: {
			dinosaurs: {
				line: "Every story becomes an interesting lesson about the universe.",
				question: "Who are the dinosaurs?",
			},
			goodnight: {
				line: "Every story ends calm, with what your child found out.",
				title: "A small adventure. Then goodnight.",
			},
			moon: {
				line: "Each question becomes a narrated, illustrated story.",
				question: "What does the moon look like?",
			},
			ocean: {
				line: "At every stop, let them pick what they're curious about.",
				question: "What's under the ocean?",
			},
			playroom: {
				line: "Little adventures that start with your child's own questions.",
			},
			saturn: {
				line: "Your child is the hero, drawn from a photo you add.",
				question: "What are Saturn's rings made of?",
			},
			star: {
				line: "Let them generate their own story.",
				title: "Children are curious. Help them learn.",
			},
		},
		waitlist: {
			body: "We'll only use your email to tell you when the app is ready.",
			close: "Close",
			done: "You're on the list. We'll write when it's ready.",
			emailLabel: "Your email",
			error: "We couldn't reach the list just now. Please try again.",
			invalid: "That email doesn't look right. Check it and try again.",
			submit: "Keep me posted",
			title: "Get it when it's ready",
		},
	},
	es: {
		badges: {
			appStore: "Descárgalo en el App Store",
			comingSoon: "Muy pronto en iPhone y Android.",
			googlePlay: "Disponible en Google Play",
			joinWaitlist: "(únete a la lista de espera)",
		},
		hint: { scroll: "Desplázate hacia abajo", swipe: "Desliza hacia abajo" },
		language: { label: "Idioma", name: "Español" },
		loader: "Preparando la aventura",
		meta: {
			description:
				"Los niños preguntan en voz alta. Un cuento ilustrado corto les responde, con ellos como protagonistas, datos reales y unas buenas noches tranquilas.",
			ogLocale: "es_ES",
			shareDescription:
				"Los niños preguntan en voz alta. Un cuento ilustrado corto les responde, con ellos como protagonistas, y luego buenas noches.",
			title: "Little Adventures: cuentos que nacen de la curiosidad",
		},
		quote: ["“", "”"],
		scenes: {
			dinosaurs: {
				line: "Cada cuento se convierte en una lección interesante sobre el universo.",
				question: "¿Quiénes son los dinosaurios?",
			},
			goodnight: {
				line: "Cada cuento termina en calma, con lo que tus hijos descubrieron.",
				title: "Una pequeña aventura. Y a dormir.",
			},
			moon: {
				line: "Cada pregunta se convierte en un cuento narrado e ilustrado.",
				question: "¿Cómo es la luna?",
			},
			ocean: {
				line: "En cada parada, deja que elijan lo que les da curiosidad.",
				question: "¿Qué hay bajo el océano?",
			},
			playroom: {
				line: "Cuentos para dormir que nacen de las preguntas de tus hijos.",
			},
			saturn: {
				line: "Tus hijos son los protagonistas, dibujados a partir de una foto que subes.",
				question: "¿De qué son los anillos de Saturno?",
			},
			star: {
				line: "Deja que creen su propio cuento.",
				title: "Los niños son curiosos. Ayúdalos a aprender.",
			},
		},
		waitlist: {
			body: "Solo usaremos tu correo para avisarte cuando la app esté lista.",
			close: "Cerrar",
			done: "Ya estás en la lista. Te escribiremos cuando esté lista.",
			emailLabel: "Tu correo",
			error: "No pudimos conectar con la lista. Inténtalo de nuevo.",
			invalid: "Ese correo no parece correcto. Revísalo e inténtalo de nuevo.",
			submit: "Avísame",
			title: "Recíbela cuando esté lista",
		},
	},
	fr: {
		badges: {
			appStore: "Télécharger dans l'App Store",
			comingSoon: "Bientôt sur iPhone et Android.",
			googlePlay: "Disponible sur Google Play",
			joinWaitlist: "(rejoindre la liste d'attente)",
		},
		hint: {
			scroll: "Faites défiler vers le bas",
			swipe: "Glissez vers le bas",
		},
		language: { label: "Langue", name: "Français" },
		loader: "Préparation de l'aventure",
		meta: {
			description:
				"Votre enfant pose une question à voix haute. Une courte histoire illustrée y répond, avec lui en héros, des faits réels et une fin tout en douceur.",
			ogLocale: "fr_FR",
			shareDescription:
				"Votre enfant pose une question à voix haute. Une courte histoire illustrée y répond, avec lui en héros, puis bonne nuit.",
			title: "Little Adventures\u00A0: des histoires nées de la curiosité",
		},
		quote: ["«\u00A0", "\u00A0»"],
		scenes: {
			dinosaurs: {
				line: "Chaque histoire devient une leçon intéressante sur l'univers.",
				question: "Qui sont les dinosaures\u00A0?",
			},
			goodnight: {
				line: "Chaque histoire se termine en douceur, avec ce que votre enfant a découvert.",
				title: "Une petite aventure. Puis bonne nuit.",
			},
			moon: {
				line: "Chaque question devient une histoire racontée et illustrée.",
				question: "À quoi ressemble la Lune\u00A0?",
			},
			ocean: {
				line: "À chaque étape, laissez-les choisir ce qui les intrigue.",
				question: "Qu'y a-\u2060t-\u2060il sous l'océan\u00A0?",
			},
			playroom: {
				line: "Des histoires du soir qui partent des questions de votre enfant.",
			},
			saturn: {
				line: "Votre enfant est le héros, dessiné d'après une photo que vous ajoutez.",
				question: "Les anneaux de Saturne, c'est quoi\u00A0?",
			},
			star: {
				line: "Laissez-les créer leur propre histoire.",
				title: "Petits curieux\u00A0? Aidez-\u2060les à apprendre.",
			},
		},
		waitlist: {
			body: "Nous utiliserons votre e-mail uniquement pour vous prévenir quand l'app sera prête.",
			close: "Fermer",
			done: "Vous êtes sur la liste. Nous vous écrirons dès qu'elle sera prête.",
			emailLabel: "Votre e-mail",
			error:
				"Impossible de joindre la liste pour le moment. Veuillez réessayer.",
			invalid: "Cet e-mail ne semble pas valide. Vérifiez-le et réessayez.",
			submit: "Prévenez-moi",
			title: "Recevez-la dès qu'elle est prête",
		},
	},
};
