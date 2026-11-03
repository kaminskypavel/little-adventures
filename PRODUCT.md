# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Stack

Better-T-Stack monorepo (Turborepo, bun). Two apps:

- Expo app for the child and parent. It is built and run on the web first (react-native-web), then shipped to iOS from the same code.
- Next.js web app for the public landing page (littleadventures.app) and the parent dashboard.

This repo holds the app, the app server and the public packages that call the Meta models. Video and voice production, with the production prompts, lives in a private engine, and the app reaches it through the engine's player API (REST with a bearer token). See ARCHITECTURE.md.

## Users

- **Children aged 2 to 16**, with a parent beside them guiding. They listen on the parent's phone in the evening.
- **Parents**: they sign in, set up the child's character (name, age, photo), sit with the child during the story, and check past stories in the dashboard.

## Product Purpose

Little Adventures is a story app that doubles as a learning platform. The child asks a question out loud ("why do whales sing?"). The story is built around that question and plays as narrated, illustrated video chapters. At the end of each chapter the child picks what happens next, so the story follows their curiosity, and the child learns something real along the way.

Success: the child asks for another chapter, and the parent can see what the child learned.

## Positioning

The story is generated from the child's own question and stars the child's own character, chapter by chapter, with the child steering. A fixed library app (Moshi, Calm Kids, Spotify Kids) cannot do this, and neither can a chatbot. It is not a chat interface and not a sleep or anxiety tool.

## Operating Context

- Evening, low light, in bed or on the couch. One phone, two people: the parent holds it, the child points and taps.
- Generation takes time: each chapter renders while the child waits, so the wait has to be part of the experience.
- Hackathon entry: Meta Global AI Developer Hackathon, due 2026-11-04 9 PM ET. Judged mostly from a 3-minute demo video plus the public repo.

## Capabilities and Constraints

From the app server (`apps/web`) and the engine's player API:

- Grown-up sign-in. The same token works on the app server and the engine.
- Child profile on the app server: name, age, boy or girl, and a photo uploaded through a presigned link. SAM 3.1 and Muse Image turn the photo into look avatars to pick from.
- The child's spoken question becomes text on the app server (`voice.transcribe`, Muse Voice Transcribe).
- Start an adventure from the question (`POST /adventures`), list adventures, and read one while its places are made (`GET /adventures/{id}`, polled every `pollAfterSec`).
- Mark a place visited (`POST /adventures/{id}/nodes/{node}/visit`). The goodnight opens after all 4 places.

Binding constraints:

- Only Meta models. Every Meta model call goes through a public package in this repo; the production prompts and the video and voice production live in the private engine.
- Nothing in this repo may describe how the backend works inside. The client sees only the player API.
- The repo is public and holds only work from the hackathon week.
- Undecided: the companion character's name.

## Brand Commitments

- Name: Little Adventures. Domain: littleadventures.app.
- Never use "muse" in the product name or domain. Avoid the phrases "bed adventure" and "night adventure".
- A small companion character (the user approved "a simple Muse") listens to the question, waits with the child while the chapter renders, and says goodnight. Its name is open.
- For children, but stylized and minimal. It must never look bloated, loud or sloppy.

## Evidence on Hand

- Real story pictures and clips made by the engine, kept outside this repo. Never use any that show a real child's likeness.
- No testimonials, user counts, press or pricing exist. Do not invent any.

## Product Principles

1. The child's question is the start of every story. Asking must take one tap and no typing.
2. Pictures and voice carry the meaning. Text is short and for the parent to read aloud.
3. The wait is part of the story, never a spinner.
4. Calm at the end of the day: no streaks, badges, timers, or pressure.
5. The parent stays in control of setup, likeness and history.

## Accessibility & Inclusion

- Tap targets sized for small fingers (at least 64 pt for child-facing actions).
- Low-light use: no pure white fields, no flashing, honor reduced motion.
- Every choice is shown as a picture with a spoken line, so non-readers can choose.
