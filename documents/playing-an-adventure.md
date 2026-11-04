# Playing an adventure

This is the child's side, screen by screen, from the spoken question to goodnight. The screens are in [apps/native/app](../apps/native/app) and the pieces they use are in [apps/native/src](../apps/native/src). How the adventure is made is in [How an adventure is made](how-it-works.md).

## Before the map

| Step | What the child does | Screen |
| --- | --- | --- |
| Ask | Holds the big button and speaks, lets go to send. An idea under "Or pick one" starts from that question, with no recording and no confirm step. | [home.tsx](../apps/native/app/home.tsx), [listening.tsx](../apps/native/app/listening.tsx) |
| Check | Sees the question read back, short: "Is that it?" Taps "Yes, let's go!" or "Say it again". | [verify.tsx](../apps/native/app/verify.tsx) |
| Get ready | Sees four looks: "3D movie" can be started now, and Clay, Felt and Wood are coming soon (they already work in our tests). Picks who comes along, then taps "Start". | [style.tsx](../apps/native/app/style.tsx) |
| Wait | Watches a progress bar and one fun fact at a time, changing every 5 seconds. Then taps "Start". | [making.tsx](../apps/native/app/making.tsx) |

If a word is not a question, the star says so and the child asks again. If making fails, a calm screen says "Oops, the map got smudged" and offers "Try again" ([oops.tsx](../apps/native/app/oops.tsx)). Past adventures sit on Home's "Replay past adventures" shelf, with how many places each has seen ([home.tsx](../apps/native/app/home.tsx)). A gear on Home and on the map opens Grown-ups.

## The map

The map is a fork road. The intro is open first. The star walks the road to each place the child taps, and a place opens only when the road reaches it. A place not reached yet shows its own picture, dimmed. The button reads "Keep walking", then "Say goodnight" at the end ([map.tsx](../apps/native/app/map.tsx), [fork-map.tsx](../packages/native-ui/src/fork-map.tsx)).

A place the star can walk to next carries a plate with its question. Walked places show their picture and a check. Four places hold a fact each, and the goodnight stays locked until all four are done.

## A place

A place plays in [place.tsx](../apps/native/app/place.tsx), sideways, over the picture of the place.

1. **The star asks.** A card shows the place's question in a speech balloon beside the star. With the narrator's audio, each word lights up as it is said. Without audio the card shows for 2.5 seconds. On the intro it is the child's own question, with a small line naming who asked. The card lets go a moment after the audio ends ([place-cards.tsx](../apps/native/src/place-cards.tsx)).
2. **The clips.** A place is made of short clips, played one after another. The next clip dissolves in over the last frame of the one before. The picture stays until the first frame is ready.
3. **The narration and the captions.** The Kodio engine makes the clips and the narration (Kodio's proprietary technology). The words are read along one sentence at a time. The word being said sits on a sun-coloured chip and the rest are dimmed. Captions can be switched off in the menu ([narration-bar.tsx](../packages/native-ui/src/narration-bar.tsx), [landscape-chrome.tsx](../apps/native/src/landscape-chrome.tsx)).
4. **The controls.** Back to the map, the place name, a menu, one big pause button and a thin progress line.
5. **The lesson card.** When the place ends, a still card shows "What we learned": the place's fact. There is no voice and no animation. The child taps "Got it!" ([place-cards.tsx](../apps/native/src/place-cards.tsx)). The intro has no lesson card: its fact is the child's own question, still to be answered.

The menu holds Music, Captions, Play on the TV, Start again and the way to Grown-ups ([adventure-menu.tsx](../apps/native/src/adventure-menu.tsx)). The TV is in [TV and phones](tv-and-phones.md).

## Pick a way

After a place, and its lesson card, the child picks the next place ([choice.tsx](../apps/native/app/choice.tsx), [choice-photos.tsx](../apps/native/src/choice-photos.tsx)).

- **Storybook photos.** Each way is a place picture in a cream frame with a small tilt, on the night sky, with the place's question written under it. From the intro there are two photos. From the last places a third photo, the goodnight, joins them.
- **The star's question.** The star rises between the photos and asks aloud, in a balloon, one of six lines such as "Which way shall we go?". It never repeats the last one. The voice and words follow the chosen language ([languages.md](languages.md)).
- **Locked and drawing.** The goodnight shows a lock and "1 more place first" (or the count) until the four places are done. A place still being drawn waits; the screen offers a peek at another one.
- **Watch it again.** A round button beside the menu plays the place just watched once more.
- **Picking.** A tap rings the photo for a moment, then the map walks the star there. When the goodnight opens, the title reads "All 4 places done!" and the star jumps.

## The goodnight

The goodnight scene plays like a place ([place.tsx](../apps/native/app/place.tsx)). A scene with no narration shows one fixed line, "And the moon said goodnight", with the child's name. After the scene, "What we learned" lists every place's question with its answer, and the "Goodnight" button leaves for the end.

## The end

The end shows the whole map walked and the moon open, with two round buttons: a restart icon to play again, which starts the star back at the intro, and a home icon. In the upright layout it adds a "Tonight we found out" panel with the four facts. The music fades out here ([end.tsx](../apps/native/app/end.tsx)).

## Without the engine

With the engine turned off (`EXPO_PUBLIC_ENGINE_URL=""` (quoted) in `apps/native/.env`), the app plays one bundled sample adventure on a timer. It has captions and no sound ([mock-adventure.ts](../apps/native/src/data/mock-adventure.ts)).
