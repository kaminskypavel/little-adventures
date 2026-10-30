# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Stack

Better-T-Stack monorepo (Turborepo, bun). Two apps:

- Expo app for the child and parent. It is built and run on the web first (react-native-web), then shipped to iOS from the same code.
- Next.js web app for the public landing page (littleadventures.app) and the parent dashboard.

No backend in this repo. Everything goes through the backend's player API (REST with a bearer token).

## Users

- **Children aged 2 to 11**, with a parent beside them guiding. They listen on the parent's phone in the evening.
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

From the backend's player API:

- Parent auth (bearer token or cookie), `GET /me`.
- Characters: create (name, role, age, notes), upload photos (presigned PUT), the server cuts the person out and draws an identity sheet, the parent approves it.
- Art styles list for a picker (`GET /styles`).
- Start a story from the child's question (`POST /stories`), list stories, get a story with its chapters.
- Chapter playback document, polled while it renders (`GET /chapters/{id}`); choice cards lead to the next chapter (`POST /chapters/{id}/choice`).

Binding constraints:

- Only Meta models. This repo calls no model at all; all generation happens in the backend.
- Nothing in this repo may describe how the backend works inside. The client sees only the player API.
- The repo is public and holds only work from the hackathon week.
- Undecided: the companion character's name.

## Brand Commitments

- Name: Little Adventures. Domain: littleadventures.app.
- Never use "muse" in the product name or domain. Avoid the phrases "bed adventure" and "night adventure".
- A small companion character (the user approved "a simple Muse") listens to the question, waits with the child while the chapter renders, and says goodnight. Its name is open.
- For children, but stylized and minimal. It must never look bloated, loud or sloppy.

## Evidence on Hand

- Real story stills and clips made by the backend, kept outside this repo. Never use stills that show a real child's likeness.
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
