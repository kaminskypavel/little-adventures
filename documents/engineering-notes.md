# Seven hard bugs and how they were found

Each of these looked small on the phone and hid for hours in the code. Each fix is still in the app.

## 1. Hebrew captions read backwards

- **Seen.** In Hebrew, the caption under a place showed its words left to right. The lit word moved the wrong way. Each word's full stop sat on the wrong side.
- **Cause.** A row of one box per word is laid out by the layout engine, not by the text engine, so it ignores the language's direction. Each word is also its own piece of text, so `"בזהב."` drew its stop on the right. Setting the writing direction did nothing visible on iOS. The first fix went into the upright caption only, and the sideways caption is a different component.
- **Fix.** In both captions a right-to-left language reverses the row and adds an invisible right-to-left mark after each word, which moves the stop to the word's left ([narration-bar.tsx](../packages/native-ui/src/narration-bar.tsx), [landscape-chrome.tsx](../apps/native/src/landscape-chrome.tsx)).
- **Guard.** No test. We checked it on an iPhone by where the first word sits and which way the highlight travels across frames. Reading the glyphs and re-typing them hid the bug at first.

## 2. A question that ran out of its balloon

- **Seen.** On a phone held sideways, the star's question balloon was sized for 2 lines but its words wrapped to 3. The third line spilled out. Words broke early: "bees" sat alone although "bees take" fitted.
- **Cause.** The question was one box per word, in rows we balanced by letter count. The layout engine sized the balloon from its guess, then the real glyphs came out wider.
- **Fix.** The question is now one text with a nested span for the lit word, so the text engine wraps and measures it. The line balancer was deleted ([place-cards.tsx](../apps/native/src/place-cards.tsx)). A first attempt, a fixed width and a smaller font, still overflowed.
- **Guard.** No test. It only shows on a real iPhone.

## 3. The map that would not turn

- **Seen.** The adventure screens play sideways. In a development build the map stayed upright. After a quick tap into the map and back, Home was left sideways.
- **Cause.** There were two sources of truth: the stack's per-screen option and an app-level lock. The development client puts its own view controllers in between, so the per-screen option never arrived. With both set, iOS only used the orientations both allowed. Two asynchronous locks could also land out of order.
- **Fix.** One source only, the app-level lock. It runs on every route change, and locks are queued so the phone ends on the last one asked for ([orientation-lock.ts](../apps/native/src/orientation-lock.ts), [orientation.ts](../apps/native/src/orientation.ts), [_layout.tsx](../apps/native/app/_layout.tsx)).
- **Guard.** No test. The simulator and release builds can hide it, so it is checked on a device.

## 4. A place that played on the phone, not the TV

- **Seen.** After casting, the phone said it was casting but the TV showed no map, or the place quietly played on the phone. Nothing raised an error.
- **Cause.** On a freshly opened screen the cast client is `null` for the first render. When the video was already cached, the load ran before the client existed, threw, and a fallback sent the place back to the phone. The map picture had its own twin of this bug. On iOS the screen capture returns a bare file path, and `fetch` without `file://` asks the bundler's server, which answers with its HTML index page. The uploaded "JPEG" was 36 KB of HTML.
- **Fix.** The cast hook exposes `ready: client !== null`, and the loads wait for it ([use-cast.ts](../apps/native/src/cast/use-cast.ts), [place.tsx](../apps/native/app/place.tsx)). The map reader adds the `file://` scheme and refuses anything that is not an image ([use-map-on-tv.ts](../apps/native/src/cast/use-map-on-tv.ts)).
- **Guard.** No test. When a cast "does nothing", look at what reached the TV before reading app code.

## 5. A paused video that played itself out

- **Seen.** A place stopped on the dark dip between two clips and never moved on. The next clip had already played to its end, unseen.
- **Cause.** The next clip waits paused on its first frame. Setting `playbackRate` on iOS sets the player's rate, and any rate above zero means play. Our setup code set it to 1.
- **Fix.** The setup no longer sets a rate, with a comment saying why. The rate is reset only right before `play()` ([place.tsx](../apps/native/app/place.tsx)).
- **Guard.** No test. Needs a real iPhone and a place of two or more parts.

## 6. The picture that froze before pick-a-way

- **Seen.** After a place's last clip, the picture froze for 3 to 4 seconds with the last word still lit. The narration had ended seconds earlier.
- **Cause.** The app waited for `didJustFinish`, a flag that is true for one status update. When that update was missed, only a 3 second timer let the place go.
- **Fix.** The voice also counts as ended when it started for this half, has stopped, and sits within 0.25 s of its end (`ranOut`, [place.tsx](../apps/native/app/place.tsx)). After the fix the place ends in the same tick as its last part.
- **Guard.** No test. Never gate a state change on a one-tick flag alone.

## 7. Pictures that downloaded again, then vanished

- **Seen.** The map showed empty frames while its pictures downloaded, although we had read them ahead. One picture faded in and then disappeared.
- **Cause.** Picture links are signed and change on every read, so the app caches them under a stable key. `Image.prefetch` takes only a link and cannot use that key, so the view missed the cache. Calling `release()` on a loaded picture freed the image that a view on screen was sharing.
- **Fix.** Pictures are read ahead with `Image.loadAsync`, which takes the key, decoded small. The returned reference is dropped, not released ([use-adventure.ts](../apps/native/src/data/use-adventure.ts), [engine-map.ts](../apps/native/src/data/engine-map.ts)).
- **Guard.** A test checks that each picture carries its storage key as the cache key ([engine-map.test.ts](../apps/native/src/data/engine-map.test.ts)).

More on measuring: [Performance](performance.md).
