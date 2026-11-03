import type { CalledLabels } from "@little-adventures/native-ui/called-chips";
import { defineStrings, useT } from "@/src/i18n";

export const calledStrings = defineStrings({
	en: {
		example: "Abba, Uncle Tom, Dana",
		father: "Papa",
		grandfather: "Grandpa",
		grandmother: "Grandma",
		he: "he",
		inStory: "In the story, {word} is",
		mother: "Mama",
		other: "Other",
		placeholder: "Abba",
		she: "she",
		thisGrownUp: "this grown-up",
	},
	es: {
		example: "Papá, tío Tom, Dana",
		father: "Papá",
		grandfather: "Abuelo",
		grandmother: "Abuela",
		he: "él",
		inStory: "En el cuento, {word} es",
		mother: "Mamá",
		other: "Otro",
		placeholder: "Papi",
		she: "ella",
		thisGrownUp: "esta persona",
	},
	he: {
		example: "דוד תום, דנה, נונו",
		father: "אבא",
		grandfather: "סבא",
		grandmother: "סבתא",
		he: "הוא",
		inStory: "איך מדברים על {word} בסיפור?",
		mother: "אמא",
		other: "אחר",
		placeholder: "נונו",
		she: "היא",
		thisGrownUp: "האדם הזה",
	},
});

/** The "what does the child call you" chips' words in the chosen language. */
export function useCalledLabels(): CalledLabels {
	const t = useT(calledStrings);
	return {
		example: t("example"),
		inStory: t("inStory"),
		other: t("other"),
		placeholder: t("placeholder"),
		presets: {
			father: t("father"),
			grandfather: t("grandfather"),
			grandmother: t("grandmother"),
			mother: t("mother"),
		},
		pronouns: { he: t("he"), she: t("she") },
		thisGrownUp: t("thisGrownUp"),
	};
}
