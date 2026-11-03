# Little Adventures

<p align="center"><img src=".github/readme/hero.webp" alt="Little Adventures: a bedtime adventure built around your child's own question. Two children on a moon with Saturn behind them, beside three phones showing the app." width="100%"></p>

A story app for children aged 2 to 16 that doubles as a learning platform. The child asks a question out loud ("can we fly to the moon?"), and the story is built around it: narrated, illustrated chapters that star the child's own character. At the end of each chapter the child picks what happens next, so the story follows their curiosity and teaches something real along the way. A parent sits beside them and sets things up in the app.

Website: [littleadventures.app](https://littleadventures.app) · Licence: evaluation only, see [LICENSE](LICENSE)

[![Live app](https://img.shields.io/badge/Live%20app-littleadventures.app%2Fweb-1d2b4f)](https://www.littleadventures.app/web) [![Open weights on Hugging Face](https://img.shields.io/badge/Hugging%20Face-glimmer--decision--little--adventures-FFD21E)](https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures)

## What it looks like

<p align="center"><img src=".github/readme/screens.webp" alt="Four app screens: the child's question confirmed, the adventure being made with the child's clay look on the hill, a place being read aloud word by word, and the adventure map." width="100%"></p>

## Hackathon submission

Meta Global AI Hackathon 2026. Track: **Startup** (Kodio Ltd). Problem statement: **Build for Your World**.

- **Provenance:** this repo was started on Oct 30, 2026, inside the building period (Oct 27 to Nov 4). Everything in it was written then. The private engine runs on Kodio Ltd's pre-existing technology; [ARCHITECTURE.md](ARCHITECTURE.md) shows the split.
- **Best Build on Meta Open Weight Models:** our LoRA on Muse Glimmer 30B decides the story checks, and beats Muse Spark 1.3 and two frontier models from another lab at their high reasoning effort. Weights: [Hugging Face card](https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures) (access on request). Results: [benchmarks/checker](benchmarks/checker).
- **Best Creative Build:** Muse Image, with SAM 3.1, turns the child's photo into the hero's looks and draws the cast ([packages/image-editing](packages/image-editing), [packages/api/src/art.ts](packages/api/src/art.ts)).
- **Best Agentic Use-Case:** the engine writes the adventure, a second model checks it with yes/no questions, the writer rewrites with the checker's reasons, and the engine refuses after two failed rounds. The loop runs in the private engine; the public part is [packages/decision](packages/decision).
- Demo video (3 min): added on submission day
- **Try it:** the live app at [littleadventures.app/web](https://www.littleadventures.app/web) is a private beta; judges find the invite code in our submission form. Or run it locally with no keys: `bun install`, `bun run dev:native`, press `w`. It plays one bundled sample adventure.

## For judges

| Pillar | Where to look |
| --- | --- |
| Impact (30%) | [PRODUCT.md](PRODUCT.md) (who it is for), [A child's data](#a-childs-data), [Limits](#limits) |
| Use of Meta AI tooling (25%) | [How an adventure is made](#how-an-adventure-is-made), [Meta models](#meta-models), [Open weights](#open-weights), [benchmarks/checker](benchmarks/checker) |
| Technical depth (20%) | [ARCHITECTURE.md](ARCHITECTURE.md), [packages/decision](packages/decision), [.github/workflows](.github/workflows) |
| Demo (25%) | The demo video line above, [Run it](#run-it), the browser smoke test [apps/native/e2e/smoke.spec.ts](apps/native/e2e/smoke.spec.ts) |

## How an adventure is made

<p align="center"><img src=".github/readme/adventure-flow.svg" alt="Flow diagram: the child asks out loud; the app server turns speech into text with Muse Voice Transcribe and the photo into looks with Muse Image and SAM 3.1; inside the Kodio engine Muse Spark 1.3 writes the map, the tuned Muse Glimmer checks it and sends it back with reasons, Muse Image and SAM 3.1 draw the cast, and the map plays in the app." width="100%"></p>

### How Meta's models run inside the Kodio engine

The Kodio engine is our startup's private story technology (Kodio Ltd). It existed before the hackathon; this week we rebuilt its story steps on Meta's models. It reaches every Meta model through the public packages in this repo, so each kind of call it makes is in code you can read here. What stays private is its prompts and question sets.

One adventure, step by step:

1. **Screen the question.** Muse Spark 1.3 (`decision`) checks that the child's question is safe and suits a bedtime story. It also shortens the question for the screen and writes the small facts the child sees while waiting (`llm`).
2. **Write the map.** Muse Spark 1.3 (`llm`, structured output) writes the adventure as a themed map: an end goal, four places with one true fact each that answers the question, and a goodnight that recaps them.
3. **Check and rewrite.** The checker answers yes or no to the story checks (calm for the child's age, names stay the same, one fact per place, the goodnight recaps, nothing scary, the facts are true and answer the question). It is our LoRA on Muse Glimmer 30B, served on Modal; while its GPU wakes, Muse Spark Open on Baseten answers instead. A failed check comes back with one sentence of reason, the writer rewrites with those reasons, and after two failed rounds the engine stops rather than give the child a weak story.
4. **Draw the cast.** Muse Image draws the story's cast and the end-goal picture, starting from the looks the app server drew from the child's photo. SAM 3.1 finds the end-goal object so it can be cut out cleanly.
5. **Pictures, clips and voice.** The place pictures, the short clips and the narration are made inside the engine by our proprietary technology and the models it runs. Muse Spark 1.3 looks at frames of every clip and sends back any clip with a visible fault before the child sees it.
6. **Play.** The app polls the player API and plays each place as soon as it is ready.

Every model call, Meta or not, is recorded with its model, operation, time and cost.

## Meta models

| Model | Job | Code | Runs |
| --- | --- | --- | --- |
| Muse Spark 1.3 | Structured output (`llm`) and yes/no checks (`decision`). The engine uses both to write and check the map. | [packages/llm](packages/llm), [packages/decision](packages/decision) | Meta Model API |
| Muse Image 1.0 | Draws the hero's looks from the child's photo, and the cast. | [packages/image-editing](packages/image-editing) | Meta Model API |
| SAM 3.1 | Cuts the person out of a photo. | [packages/image-editing](packages/image-editing) | Meta Model API |
| Muse Voice Transcribe 1.0 | Turns the child's spoken question into text. | [packages/transcribe](packages/transcribe) | Meta Model API |
| Muse Glimmer 30B + our LoRA | The story checker. `decision` talks to it through its `baseUrl` and `model` options and reads yes/no probabilities from the logprobs of the first answer token. | [packages/decision](packages/decision) | Served on Modal |
| Muse Spark Open | Fallback checker when the tuned model is asleep. | [packages/decision](packages/decision) | Served on Baseten |

Not used: Muse Wonder, Muse Code.

## Open weights

The LoRA on Muse Glimmer 30B answers the yes/no checks on a story plan. It was trained with LoRA rank 16, alpha 32, bf16, for one epoch, on synthetic story plans written by Muse Spark models. Each row's label was set by how the row was built. No data from real children was used.

Results on the full held-out set of 1,498 rows, as mean balanced accuracy:

<p align="center"><img src=".github/readme/checker-chart.svg" alt="Scatter chart of accuracy against time per check, split at Muse Spark 1.3: the tuned Muse Glimmer models sit in the more accurate and faster quarter." width="88%"></p>

| Checker | Accuracy | Time per full check |
| --- | --- | --- |
| Tuned Glimmer v2 alone | 94.5% | 1.05 s |
| Muse Spark 1.3 | 89.8% | 4.49 s |
| Base Muse Glimmer | 81.6% | 8.92 s |
| Glimmer v1, with Muse Spark Open on the two fact checks | 96.8% | 2.07 s |

**Against frontier models.** We also ran two frontier models from another lab, at high reasoning effort, on 609 of the held-out rows (101 story plans never seen in training). The tuned Glimmer v2 beat both: 95.4% mean balanced accuracy with no false alarms, against 90.7% and 4.2% false alarms for the stronger of the two. Muse Spark 1.3 scored 92.0% on the same rows, and our hybrid 98.9%. The full table, with every model named, is on the [model card](https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures#benchmarks).

On the same 1,498 rows, Glimmer v2 is right where Muse Spark 1.3 is wrong 49 times, and the reverse happens 8 times (exact McNemar test, p = 2.7e-8). The last row is optimistic: its routing was picked after seeing test results. Model card: [Hugging Face](https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures). Method and data: [benchmarks/checker](benchmarks/checker). `bun run eval:checker` replays the results offline, with no key.

## A child's data

- **The photo.** The app uploads it straight to an S3-compatible bucket with a one-shot signed link (10 minutes, size capped). The server picks the key, under the grown-up's own prefix, and refuses any key that is not theirs. Reads use signed links that expire after 1 hour. See [packages/storage](packages/storage) and [packages/api/src/routers/photo.ts](packages/api/src/routers/photo.ts).
- **Which Meta calls see it.** SAM 3.1 and Muse Image get a signed link to the photo, and to the drawn looks ([packages/api/src/art.ts](packages/api/src/art.ts)). Muse Image and Muse Voice Transcribe calls carry an opaque safety id (a hash of the account id), never an email.
- **The spoken question.** The app sends the recording to the server, which checks it and passes it to Muse Voice Transcribe. The server writes no audio to the bucket or the database ([voice.ts](packages/api/src/routers/voice.ts)). The only record of a model call is a row with model, operation, time, cost and result, with no content (`ai_calls` in [packages/db](packages/db)). The text of the question goes on to the private engine to make the adventure.
- **No data-sharing tier.** The three Meta model ids in this repo (`sam-3.1`, `muse-image-1.0`, `muse-voice-transcribe-1.0`) are standard ids. None ends in `-contributor`.
- **Deleting.** A parent can delete a child's photo, face cut-out and drawn looks, and the grown-up's photo and profile (`photo.delete`, `grownUp.delete`).
- **Sign-in.** Neon Auth, with a bearer token for the app. Every paid call is refused for an account that is not in the private beta, before any model is called ([packages/auth](packages/auth), [packages/api/src/index.ts](packages/api/src/index.ts)). An empty beta list lets nobody in.

## Limits

- The place pictures, short clips and narration are made in the Kodio engine by our proprietary technology and the models it runs, not by Meta models. Without the engine, the app plays one bundled sample adventure.
- English only.
- The iOS and Android builds are not in the stores. The app runs in the browser and in Expo.
- The Glimmer LoRA numbers above are the team's own, on synthetic data. The 96.8% hybrid is optimistic (see Open weights).
- Deleting a whole child profile, or a whole account with its model-call rows, is not implemented. Only the photos and art can be deleted.
- This repo cannot show what the private engine does with a child's data, or which model ids it uses. The no-data-sharing-tier statement above covers the ids in this repo only.

## How it fits together

This repo holds the app, the app server and the public packages that make every Meta model call (Muse Spark, Muse Image, SAM 3.1, Muse Voice Transcribe, and the Glimmer checker through `decision`). Its commit history is the real record of the week's work. The production prompts, plus the video and voice production, live in a private engine at engine.littleadventures.app. The engine runs on our startup's proprietary technology, which existed before the hackathon. That technology uses Meta's models, through the public packages in this repo; how it uses them is what we cannot disclose during the hackathon. [ARCHITECTURE.md](ARCHITECTURE.md) shows the split and why.

The Next.js app serves the landing page and a small tRPC API (waitlist, sign-in, child and grown-up profiles, photos, `voice.transcribe`). The Expo app talks to that API and, when `EXPO_PUBLIC_ENGINE_URL` is set, to the private engine through its player API with the same sign-in token (every call is in `apps/native/src/data/engine-client.ts`).

```
apps/native (child + parent app) ─► apps/web API (tRPC) ─► packages/* ─► Meta models
        │                              └─ Postgres (waitlist)
        └─ player API, same token ─► private engine (engine.littleadventures.app)
```

## Apps

| Path | What it is | Stack |
| --- | --- | --- |
| `apps/native` | The app the child and parent use. Runs in the browser first, then ships to iOS from the same code. | Expo, React Native, Uniwind |
| `apps/web` | Public landing page and the tRPC API the app talks to. | Next.js, GSAP, tRPC |
| `packages/api` | tRPC routers: child and grown-up profiles, photo upload, voice transcription, waitlist. | tRPC, Zod |
| `packages/auth` | Sign-in, the app's bearer token and the private beta allowlist. | Neon Auth |
| `packages/llm` | Structured-output client for Muse Spark. | Zod |
| `packages/decision` | Yes or no question sets on Muse Spark, with a pass threshold. | Zod |
| `packages/image-editing` | SAM 3.1 person cut-out and Muse Image looks, edits and generation. | |
| `packages/transcribe` | Muse Voice Transcribe for the child's spoken question. | |
| `packages/storage` | Photos and drawn looks in an S3-compatible bucket, with signed URLs. | AWS SDK (S3) |
| `packages/validation` | Zod schemas the app and the server share (child, photo, sign-in). | Zod |
| `packages/db` | Database schema and client. | Drizzle, Postgres (Neon) |
| `packages/native-ui` | The app's clay design system: tokens, text, buttons, the map and the sky. | React Native, Reanimated |
| `packages/ui` | Shared web UI primitives. | shadcn/ui, Tailwind CSS |
| `packages/config` | Shared TypeScript config. | |

## Run it

Needs Node 24 (pinned in `.nvmrc`) and bun.

```bash
nvm use
bun install
bun run dev:web      # landing + API on http://localhost:3001
bun run dev:native   # Expo dev server, press w to open the app in the browser
```

The app runs with no engine: with `EXPO_PUBLIC_ENGINE_URL` unset it plays its bundled sample adventure, so you can try it alone. To use an engine, set the variable (see Configuration) before `bun run dev:native`. Allowlisted accounts then get live adventures and every other account gets a recorded adventure.

To build for iOS, run `bun run ios` from `apps/native` (needs Xcode).

## Configuration

Each app declares its environment in `.env.schema`, and Varlock generates a typed `src/env.ts` on install (`bun run env:generate` after a schema change). Real values go in ignored `.env` files.

| Variable | App | Value |
| --- | --- | --- |
| `EXPO_PUBLIC_SERVER_URL` | `apps/native` | Base URL of the apps/web API |
| `EXPO_PUBLIC_ENGINE_URL` | `apps/native` | Optional. Base URL of the private engine's player API. Unset: the bundled sample adventure plays |
| `DATABASE_URL` | `apps/web` | Postgres connection string for the waitlist |

## Prompts

`llm` and `decision` ship no production prompts and no question sets. The only prompts in this repo are the avatar look prompts in `packages/image-editing/src/looks.ts`. `packages/llm` throws without instructions, and `packages/decision` throws when `createDecision` gets none. Each expects its caller to bring its own:

- `llm`: instructions, a prompt and a zod schema per call. It returns JSON validated against the schema.
- `decision`: the shared instructions (and optional note for attached images) when you create it, then a named question set per call, each question with its own instructions, plus a pass threshold and what to do when the API cannot be reached.
- `image-editing`: the image or images and the edit or generation request per call. Calls throw on failure; the caller decides what that means.
- `transcribe`: a WAV recording (16 kHz, mono).

The production prompts were written this week and are held by the private engine, so the shape of the product's output cannot be copied. The engine runs on our startup's proprietary technology, which predates the hackathon. It calls Meta's models through the public packages above; how it uses them is the team's trade secret. [ARCHITECTURE.md](ARCHITECTURE.md) has the reasoning and the organizers' ruling.

## Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | Start every app |
| `bun run dev:web` | Start the Next.js app |
| `bun run dev:native` | Start the Expo dev server |
| `bun run build` | Build every app |
| `bun run check-types` | Type-check the whole repo |
| `bun run test` | Run every unit test suite |
| `bun run test:e2e` (in `apps/native`) | Smoke-test the app in a phone-sized browser: Welcome to the email step (Playwright; CI runs it when the app changes) |
| `bun run db:generate` / `bun run db:migrate` | Create and apply database migrations |
| `bunx ultracite check` / `bunx ultracite fix` | Lint and format (Biome) |

A Husky pre-commit hook runs lint-staged with Ultracite on staged files.

## Project structure

```
little-adventures/
├── apps/
│   ├── native/   # Expo app (web first, then iOS)
│   └── web/      # Next.js landing page and tRPC API
├── packages/
│   ├── api/            # tRPC routers
│   ├── auth/           # Sign-in and the private beta
│   ├── config/         # Shared TypeScript config
│   ├── db/             # Drizzle schema and client
│   ├── decision/       # Muse Spark yes or no checks
│   ├── image-editing/  # SAM 3.1 and Muse Image
│   ├── llm/            # Muse Spark structured output
│   ├── native-ui/      # The app's design system
│   ├── storage/        # Photo and art bucket
│   ├── transcribe/     # Muse Voice Transcribe
│   ├── ui/             # Shared shadcn/ui components and styles
│   └── validation/     # Shared zod schemas
├── ARCHITECTURE.md     # The public and private split, for judges
└── PRODUCT.md          # Who it is for and what it must do
```
