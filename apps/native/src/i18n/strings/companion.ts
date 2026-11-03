import type { CompanionLabels } from "@little-adventures/native-ui/companion-track";
import { defineStrings, useT } from "@/src/i18n";

export const companionStrings = defineStrings({
	en: {
		group: "Who's coming",
		puppy: "Puppy",
		puppySubtitle: "Best friend",
		you: "You",
	},
	he: {
		group: "מי בא איתנו",
		puppy: "גור כלבים",
		puppySubtitle: "החבר הכי טוב",
		you: "אתם",
	},
});

/** Who's coming: the track's words in the chosen language. */
export function useCompanionLabels(): CompanionLabels {
	const t = useT(companionStrings);
	return {
		group: t("group"),
		puppy: t("puppy"),
		puppySubtitle: t("puppySubtitle"),
		you: t("you"),
	};
}
