// The app's two languages. Every screen's words live in a strings file under src/i18n/strings,
// English and Hebrew side by side (`defineStrings`), and `useT` picks the language the grown-up
// chose (Grown-ups > Language, kept in player-prefs). Hebrew keeps the left-to-right layout; only
// its text reads right to left (the user's call).
import { usePlayerPrefs } from "@/src/data/player-prefs";

export type Language = "en" | "he";

/** The choices on the Language row, each named in its own language, with its flag (an emoji). */
export const LANGUAGES: readonly {
	code: Language;
	flag: string;
	name: string;
}[] = [
	{ code: "en", flag: "🇺🇸", name: "English" },
	{ code: "he", flag: "🇮🇱", name: "עברית" },
];

type Strings = Record<string, string>;
export interface StringSet<E extends Strings> {
	en: E;
	he: { [K in keyof E]: string };
}
type Vars = Record<string, number | string>;

/** One screen's words: every key in English, and the same keys in Hebrew (the type checks both). */
export const defineStrings = <const E extends Strings>(set: StringSet<E>) =>
	set;

const SLOT = /\{(?<key>\w+)\}/gu;
/** Fills `{name}` slots from `vars`; a slot with no value stays as written. */
export const fill = (text: string, vars?: Vars) =>
	vars
		? text.replace(SLOT, (slot, key: string) =>
				key in vars ? String(vars[key]) : slot
			)
		: text;

const pick = <E extends Strings>(
	set: StringSet<E>,
	language: Language,
	key: keyof E & string,
	vars?: Vars
) => fill(set[language][key] ?? set.en[key], vars);

/** The language the grown-up chose. */
export const useLanguage = (): Language => usePlayerPrefs((s) => s.language);

/** The language right now, outside React (data code, timers). */
export const languageNow = (): Language => usePlayerPrefs.getState().language;

/** A screen's words in the chosen language: `t("key", { name })`. Re-renders when it changes. */
export function useT<E extends Strings>(set: StringSet<E>) {
	const language = useLanguage();
	return (key: keyof E & string, vars?: Vars) => pick(set, language, key, vars);
}

/** The same, outside React. */
export const tNow = <E extends Strings>(
	set: StringSet<E>,
	key: keyof E & string,
	vars?: Vars
) => pick(set, languageNow(), key, vars);

/** Whether the language reads right to left. */
export const isRtl = (language: Language) => language === "he";
