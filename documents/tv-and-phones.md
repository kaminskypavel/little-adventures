# TV and phones

Little Adventures is one Expo app for iPhone and Android. A story can also play on a TV, with the phone as the remote.

## What each phone supports

| Feature | iPhone | Android |
| --- | --- | --- |
| Hold the button and ask out loud | Yes | Yes |
| Adventure screens sideways, the rest upright | Yes | Yes |
| Play a place on a TV | Yes | Yes |
| System back button leaves a place for the map | No such button | Yes |

The config is in [app.json](../apps/native/app.json). It also lets the iOS app run on tablets. Store builds are not out yet (see [Impact, limits and what's next](impact.md)).

## Asking out loud

A child holds the button and speaks, and lets go to send. A press shorter than half a second is dropped with a gentle hint. A question stops by itself at 29 seconds ([voice-rules.ts](../apps/native/src/data/voice-rules.ts), [use-ask.ts](../apps/native/src/voice/use-ask.ts)).

- **Same file on both.** The app sends a 16 kHz mono 16-bit WAV to the app server, which hands it to Muse Voice Transcribe 1.0 (up to 30 seconds, [voice.ts](../packages/api/src/routers/voice.ts)).
- **iPhone.** The system recorder writes the WAV ([recorder.ts](../apps/native/src/data/recorder.ts)).
- **Android.** Its system recorder cannot write WAV. A small local module reads the microphone and writes the same WAV ([recorder.android.ts](../apps/native/src/data/recorder.android.ts), [modules/wav-recorder](../apps/native/modules/wav-recorder)).
- **Permission.** The microphone is asked for when the child first holds the button. If it is refused, nothing is recorded ([mic-permission.ts](../apps/native/src/data/mic-permission.ts)). The prompt says the app listens only while the child says a question.

## Sideways for the adventure

The map, Pick a way, the place player and the end lock to landscape. Every other screen locks to upright. One component sets this, and it queues the locks, so a quick trip to the map and back cannot leave Home sideways ([_layout.tsx](../apps/native/app/_layout.tsx), [orientation-lock.ts](../apps/native/src/orientation-lock.ts), [orientation.ts](../apps/native/src/orientation.ts)).

Screens pick a sideways or an upright layout from the window shape. The sideways player keeps the video clear: back and the place name at the top left, the menu at the top right, a slim caption band, pause at the bottom right and a thin progress line ([landscape-chrome.tsx](../apps/native/src/landscape-chrome.tsx)).

## Playing on a TV

The Cast code is in [src/cast](../apps/native/src/cast). It works on iPhone and Android with TVs on the same network.

- **Finding a TV.** On iPhone, a note explains why the app looks for devices on the home network. The sideways menu gets a "Play on the TV" row when a TV is on the network or already connected. The upright map and place player show a round Cast button instead ([adventure-menu.tsx](../apps/native/src/adventure-menu.tsx), [cast-button.tsx](../apps/native/src/cast/cast-button.tsx), [use-cast.ts](../apps/native/src/cast/use-cast.ts)).
- **A place.** The app asks the Kodio engine for the place as one video, with a subtitle file. It loads that on the TV with the place's picture, name and length.
- **The TV subtitle track.** One WebVTT track, switched on after the load: white on a dark box, large enough for the sofa. Its language and name follow the app's language ([types.ts](../apps/native/src/cast/types.ts), [languages.md](languages.md)).
- **The map and the ways.** While a TV is connected, the phone photographs the map, and Pick a way, 1.5 seconds after they settle. It uploads the picture and the TV shows it. It does this again when the screen changes. Any error is ignored, so the TV never breaks the screen ([use-map-on-tv.ts](../apps/native/src/cast/use-map-on-tv.ts)).

## What the phone shows while casting

The phone keeps the place player's controls ([place.tsx](../apps/native/app/place.tsx), `TvPlayer`).

- The place's picture, with a pill: "Getting ready for the TV", then "Playing on" and the TV's name.
- The words, following the TV's position, and a progress line.
- A pause button that pauses and plays the TV.
- When the TV reaches the end, the place ends on the phone too, and the lesson card follows. Going back to the map stops the TV.
- If the TV cannot be given the video (not ready, the place has no finished video yet, or any failure), the place plays on the phone.

## Limits

- Casting needs the Kodio engine. The bundled sample adventure plays on a timer, with no sound, and has no TV video.
- The phone must reach the TV before a place loads, so the request waits for the connection.
- Android pins the Cast framework to version 22.3.1 so the release build works ([app.json](../apps/native/app.json)).
