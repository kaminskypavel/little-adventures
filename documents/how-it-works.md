# How an adventure is made

<p align="center"><img src="../.github/readme/adventure-flow.svg" alt="Flow diagram: the child asks out loud; the app server turns speech into text with Muse Voice Transcribe and the photo into looks with Muse Image and SAM 3.1; inside the Kodio engine Muse Spark 1.3 writes the map, the tuned Muse Glimmer checks it and sends it back with reasons, Muse Image and SAM 3.1 draw the cast, and the map plays in the app." width="100%"></p>

## How Meta's models run inside the Kodio engine

The Kodio engine is our startup's private story technology (Kodio Ltd). It existed before the hackathon; this week we rebuilt its story steps on Meta's models. It reaches every Meta model through the public packages in this repo, so each kind of call it makes is in code you can read here. What stays private is its prompts and question sets.

One adventure, step by step:

1. **Screen the question.** Muse Spark 1.3 (`decision`) checks that the child's question is safe and suits a bedtime story. It also shortens the question for the screen and writes the small facts the child sees while waiting (`llm`).
2. **Write the map.** Muse Spark 1.3 (`llm`, structured output) writes the adventure as a themed map: an end goal, four places with one true fact each that answers the question, and a goodnight that recaps them.
3. **Check and rewrite.** The checker answers yes or no to the story checks (calm for the child's age, names stay the same, one fact per place, the goodnight recaps, nothing scary, the facts are true and answer the question). It is our LoRA on Muse Glimmer 30B, served on Modal; while its GPU wakes, Muse Spark Open on Baseten answers instead. A failed check comes back with one sentence of reason, the writer rewrites with those reasons, and after two failed rounds the engine stops rather than give the child a weak story.
4. **Draw the cast.** Muse Image draws the story's cast and the end-goal picture, starting from the looks the app server drew from the child's photo. SAM 3.1 finds the end-goal object so it can be cut out cleanly.
5. **Clips and voice.** The short clips and the narration are made inside the engine by our proprietary technology and the models it runs. Muse Spark 1.3 looks at frames of every clip and sends back any clip with a visible fault before the child sees it.
6. **Play.** The app polls the player API and plays each place as soon as it is ready.

Every model call, Meta or not, is recorded with its model, operation, time and cost.

## How it fits together

This repo holds the app, the app server and the public packages that make every Meta model call (Muse Spark, Muse Image, SAM 3.1, Muse Voice Transcribe, and the Glimmer checker through `decision`). Its commit history is the real record of the week's work. The production prompts, the short clips and the narration live in the Kodio engine at engine.littleadventures.app, which runs on Kodio Ltd's proprietary technology from before the hackathon. It reaches Meta's models through the public packages in this repo, in the steps shown in [How Meta's models run inside the Kodio engine](#how-metas-models-run-inside-the-kodio-engine). [ARCHITECTURE.md](../ARCHITECTURE.md) shows the split and why.

The Next.js app serves the landing page and a small tRPC API (waitlist, sign-in, child and grown-up profiles, photos, `voice.transcribe`). The Expo app talks to that API and, when `EXPO_PUBLIC_ENGINE_URL` is set, to the Kodio engine through its player API with the same sign-in token (every call is in `apps/native/src/data/engine-client.ts`).

```
apps/native (child + parent app) ─► apps/web API (tRPC) ─► packages/* ─► Meta models
        │                              └─ Postgres (waitlist)
        └─ player API, same token ─► Kodio engine (engine.littleadventures.app)
```
