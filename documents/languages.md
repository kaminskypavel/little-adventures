# Languages: English, Spanish and Hebrew

The app speaks three languages. A grown-up picks one in Grown-ups, and every screen, the star's spoken question, the captions and the adventure itself follow it.

## Choosing a language

- **Where.** Grown-ups has a Language row. It shows the current flag and the language's own name. A tap opens a sheet with one row per language and a check on the current one ([language-picker.tsx](../apps/native/src/language-picker.tsx), [grownups.tsx](../apps/native/app/grownups.tsx)).
- **Kept on the phone.** The choice is stored with the other player settings and starts as English ([player-prefs.ts](../apps/native/src/data/player-prefs.ts)).
- **When it applies.** The language changes after the sheet has sunk away, so nothing flips while it moves.
- **The next adventure.** A change drops the adventure that was prepared ahead and prepares it again in the new language ([draft-store.ts](../apps/native/src/data/draft-store.ts)).

## Words on every screen

Each screen has its own strings file in [src/i18n/strings](../apps/native/src/i18n/strings), with English, Spanish and Hebrew side by side. The type checker rejects a key that is missing in any of the three. A line can hold slots such as `{name}`, filled in at run time. The core is [src/i18n/index.ts](../apps/native/src/i18n/index.ts) and its test is [i18n.test.ts](../apps/native/src/i18n/i18n.test.ts).

The files cover Welcome, sign-in, the child and photo steps, Home, the ask screens, the map, the place player and its cards, Pick a way, the end, Your stories, the adventure menu and Grown-ups. Shared pieces such as the "called" chips and the "Who's coming" track take their words as props, so [packages/native-ui](../packages/native-ui) stays free of any language.

## Right to left

Hebrew text reads right to left. The screens are not mirrored: the layout stays left to right ([index.ts](../apps/native/src/i18n/index.ts)). These pieces do change for Hebrew:

| Piece | What changes | File |
| --- | --- | --- |
| Captions in the place player | The first word sits at the right and lines fill leftward. A right-to-left mark after each word puts a full stop or comma on its left. | [narration-bar.tsx](../packages/native-ui/src/narration-bar.tsx), [landscape-chrome.tsx](../apps/native/src/landscape-chrome.tsx) |
| Plan card | The tag moves to the top left, the text aligns right and the dots sit on the right. | [plan-card.tsx](../packages/native-ui/src/plan-card.tsx) |
| Language row and sheet | Rows reverse, the arrow flips and the sheet title aligns right. | [language-picker.tsx](../apps/native/src/language-picker.tsx), [bottom-sheet.tsx](../packages/native-ui/src/bottom-sheet.tsx) |

## The star asks aloud

On Pick a way the star asks one of six questions, never the same one twice in a row. Each question has a bundled voice file in each language ([assets/voice](../apps/native/assets/voice)), and the balloon shows the same words from the choice strings. The file played is the one for the chosen language ([choice-photos.tsx](../apps/native/src/choice-photos.tsx)).

## The language goes to the engine

The app tells the Kodio engine which language to use ([engine-client.ts](../apps/native/src/data/engine-client.ts)).

- **Sent in the body:** starting an adventure, preparing the next one, shortening the child's question and asking for the fun facts shown while the adventure is made.
- **Sent as `?language=`:** reading one adventure and listing the shelf. English adds nothing, so English reads are unchanged.
- **Cached per language.** An adventure is stored under its id and language, and Home's shelf under its language, so a change reads them again ([use-adventure.ts](../apps/native/src/data/use-adventure.ts), [adventure-client.ts](../apps/native/src/data/adventure-client.ts)).

## Narration and captions

The clips and the narration come from the Kodio engine (Kodio's proprietary technology). The app plays the narration file the engine returns for the chosen language, and pins each part's voice by its file, so a new language plays its own voice ([engine-map.ts](../apps/native/src/data/engine-map.ts)). Captions use the words that come with that narration. On a TV, the subtitle track takes its language and its name from the app's language ([cast/types.ts](../apps/native/src/cast/types.ts)). See [TV and phones](tv-and-phones.md).

## Not translated yet

- The admin tools and the design-kit screens are English only ([src/admin](../apps/native/src/admin)).
- The play and pause labels in the sideways player and the Cast button's label stay in English ([landscape-chrome.tsx](../apps/native/src/landscape-chrome.tsx), [cast-button.tsx](../apps/native/src/cast/cast-button.tsx)).
- The shared validation messages stay in English. The app maps the ones it shows to the chosen language ([form-errors.ts](../apps/native/src/i18n/strings/form-errors.ts)).
- The recorded question goes to transcription as audio only. The app sends no language with it ([adventure-client.ts](../apps/native/src/data/adventure-client.ts)).
