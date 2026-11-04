# Architecture

<p align="center"><img src="../.github/readme/system-map.webp" alt="System map: our app and the Kodio engine on the left; four models on the Meta Model API (Muse Voice Transcribe 1.0, Muse Image 1.0, SAM 3.1, Muse Spark 1.3), each with its code package and its caller; below, Meta open weights: our tuned Muse Glimmer 30B with its LoRA, answering the story checks, and Muse Spark Open as its backup while it wakes." width="100%"></p>

A short map for hackathon judges and their agents: what is in this repo, which Meta model runs where, how a question becomes an adventure, how the tuned checker and the public `llm` and `decision` packages work, what is private and why, and what you can run without the Kodio engine.

> **The Kodio engine is our startup's private story technology (Kodio Ltd). It reaches every Meta model through the public packages in this repo, so each kind of call it makes is in code you can read here. Its prompts and question sets stay private.**

<p align="center"><img src="../.github/readme/adventure-flow.svg" alt="Flow diagram: the child asks out loud; the app server turns speech into text with Muse Voice Transcribe and the photo into looks with Muse Image and SAM 3.1; inside the Kodio engine Muse Spark 1.3 writes the map, the tuned Muse Glimmer checks it and sends it back with reasons, Muse Image and SAM 3.1 draw the cast, and the map plays in the app." width="100%"></p>

## Where each Meta model runs

| Model | Job | Where it runs | Through (package) | Host |
| --- | --- | --- | --- | --- |
| Muse Voice Transcribe 1.0 | Turns the child's spoken question into text. | App server | `packages/transcribe` | Meta Model API |
| Muse Image 1.0 and SAM 3.1 | Turn the child's photo, and a grown-up's if one is added, into the hero's looks. | App server | `packages/image-editing` | Meta Model API |
| Muse Spark 1.3 | Checks that the child asked a real question, shortens it for the screen, writes the waiting facts and writes the map. | Kodio engine | `packages/llm`, `packages/decision` | Meta Model API |
| Muse Glimmer 30B with our LoRA | The story checker: yes or no per story check. | Kodio engine | `packages/decision`, through its `baseUrl` and `model` options | Modal |
| Muse Spark Open | The checker's fallback while the tuned model's GPU wakes. | Kodio engine | `packages/decision` | Baseten |
| Muse Image 1.0 and SAM 3.1 | Muse Image draws the cast and the end-goal picture; SAM 3.1 cuts the end-goal object out. | Kodio engine | `packages/image-editing` | Meta Model API |

The short clips and the narration are made by Kodio's proprietary technology, not by Meta models.

## The split

<p align="center"><img src="../.github/readme/system-split.webp" alt="The app on iPhone and Android talks to the app server, which keeps the waitlist, profiles and call costs in Postgres and calls Meta models through the public client packages. For each adventure the app talks to the private Kodio engine through its player API with the same sign-in, and the engine calls Meta models through the same packages." width="100%"></p>

The app talks to the app server and to the Kodio engine through its player API (the production engine by default) with the same sign-in token (every call is in `apps/native/src/data/engine-client.ts`). Every Meta model call goes through a public package in this repo. On the app server, SAM 3.1 and Muse Image turn the child's photo, and a grown-up's, into the look avatars (`packages/api/src/art.ts`).

## How a question becomes an adventure

<p align="center"><img src="../.github/readme/adventure-sequence.webp" alt="The app sends the spoken question to the app server, which asks Muse Voice Transcribe and returns the text. The app asks the Kodio engine to make an adventure in the chosen language; the engine writes, checks and draws it with Meta models. The app reads the map in a loop until every place is ready, then tells the engine when a place was visited." width="100%"></p>

- Each ready place carries its clip and narration.
- The app speaks English, Spanish and Hebrew. The language the grown-up picked goes with every engine call that shortens the question, writes the waiting facts or makes the adventure, and reads of an adventure ask for it. Hebrew text reads right to left.
- Once the question is confirmed the app can start a draft (`POST /adventures/drafts`), and the style screen's Start commits it (`.../start`). If that fails, the plain create call above takes over (`apps/native/src/data/draft-store.ts`).
- A place can play on a TV: the app asks the engine for the place as one video with read-along words (`POST .../nodes/{node}/cast`).
- The goodnight scene stays locked until all 4 places are visited.
- The app waits at most 6 minutes, and gives up after 4 failed reads in a row. Then it shows a calm error screen.
- The player API client is `apps/native/src/data/engine-client.ts`, and the mapping to screens is `engine-map.ts` beside it.

## The tuned checker

The checker answers yes or no to each story check. `decision` reads the answer from the probability of the first answer token.

- It is our LoRA on Muse Glimmer 30B, served on a Modal GPU that sleeps when idle.
- A check that finds the GPU asleep wakes it and goes to Muse Spark Open on Baseten in the meantime.
- Results and the offline replay are in [benchmarks/checker](../benchmarks/checker): `bun run eval:checker` needs no key.
- Model card on Hugging Face (access on request): [kaminskypavel/glimmer-decision-little-adventures](https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures).

## The `llm` and `decision` packages

Both packages are prompt-free clients for Muse Spark on Meta's Model API (`decision` can point at another server through `baseUrl`). The caller brings its own instructions, gets validated results back, and decides what to do with them.

<p align="center"><img src="../.github/readme/model-clients.webp" alt="packages/llm: the caller brings instructions, a prompt and a zod schema; one Muse Spark 1.3 call returns checked data with time and tokens, or throws. packages/decision: the caller brings a question set, state and images; one call per set with one retry returns P(yes) and a reason per question, and passed() gives pass or fail with the reasons; with no usable answer the set's own policy proceeds or refuses." width="100%"></p>

What the caller passes: the key, the model name, its instructions, a zod schema or a question set, and a `safetyId` (an opaque, stable id of the grown-up, never an email). The packages return the validated result, the time taken and the tokens used, so the caller can record the cost of every call.

### `packages/llm`: structured output

- One `POST https://api.meta.ai/v1/chat/completions` per call. The caller's instructions and prompt are the two messages. `response_format` is a strict JSON schema made from the caller's zod schema, and `safety_identifier` carries the `safetyId`.
- Returns `{ data, model, ms, usage }`. `data` has been parsed by the zod schema.
- No retries, because a retry is billed again. It throws on missing instructions (before any request), a missing key, a non-2xx reply, an empty reply, or a reply that does not match the schema. The caller decides what a throw means.

### `packages/decision`: the decision API

- A question set has a name, its questions (each with its own instructions), and an `onUnreachable` policy: `proceed` or `refuse`.
- By default all questions in a set go in one request. The reply is strict JSON with `{ answer, confidence, reason }` for each question. Images can be attached. With `readout: "answer-token"` each question gets its own request and P(yes) comes from the probabilities of the first answer token (how the tuned checker is read).
- Each answer becomes P(yes): the confidence for a yes, 1 minus the confidence for a no. A question passes at P(yes) of at least 0.5 (`passAt`). A risk question marked `passWhen: "no"` passes below it.
- `decide` never throws. A missing key returns `ran: false` at once, with no request. A timeout (60 s), a non-2xx reply or a malformed verdict gets one retry, then returns `ran: false`. `passed()` then applies the set's `onUnreachable` policy. When the model did run, it returns the model's reason for each failed question.

| When a call fails | `llm` | `decision` |
| --- | --- | --- |
| Retries | none | 1 |
| Result | throws | `ran: false` |
| Who decides what happens | the caller | the question set's `onUnreachable` policy |

### Using them

```ts
import { createDecision, type QuestionSet } from "@little-adventures/decision";
import { createLlm } from "@little-adventures/llm";
import { z } from "zod";

const apiKey = process.env.META_API_KEY ?? "";
const model = "muse-spark-1.3";
const safetyId = "grown-up-123";

const llm = createLlm({ apiKey, model });
const out = await llm.generate({
  instructions: "<your instructions>",
  prompt: "<your prompt>",
  safetyId,
  schema: z.object({ answer: z.string() }),
});

const decision = createDecision({ apiKey, instructions: "<your instructions>", model });
const check: QuestionSet = {
  name: "example",
  onUnreachable: "refuse",
  questions: {
    q1: { instructions: "<a yes or no question>" },
    q2: { instructions: "<a risk question>", passWhen: "no" },
  },
};
const verdict = await decision.decide({ result: out.data }, check, { safetyId });
const { passed, reasons } = decision.passed(verdict, check);
```

The unit tests cover the main failure paths (missing instructions, a non-2xx reply, a reply that does not match the schema, an unreachable API under each policy): `packages/llm/src/llm.test.ts` and `packages/decision/src/decision.test.ts` (`bun test` in each package).

## What is public

All of it was written this week, during the hackathon (Oct 27 to Nov 4, 2026).

| Package | Meta model | What it does |
| --- | --- | --- |
| `packages/llm` | Muse Spark | Structured-output client. The caller passes instructions, a prompt and a zod schema, and gets validated JSON back. |
| `packages/decision` | Muse Spark | Decision API. Asks a set of yes or no questions about a state (and optional images), applies a pass threshold, and follows a policy for when the API cannot be reached. |
| `packages/image-editing` | SAM 3.1, Muse Image | SAM 3.1 cuts the person, or a named object, out of a photo. Muse Image applies looks, edits and generates images. |
| `packages/transcribe` | Muse Voice Transcribe | Turns the child's spoken question (WAV, 16 kHz, mono, up to 30 s) into text, on the app server's `voice.transcribe` route. |

The apps (`apps/native`, `apps/web`) and the other packages (`api`, `auth`, `db`, `storage`, `validation`, `ui`, `native-ui`, `config`) are public too.

## What is private, and why

`llm` and `decision` hold no production prompts and no question sets: they refuse to run without instructions from the caller and point to the "Prompts" section of the [README](../README.md). The only prompts in this repo are the avatar look prompts in `packages/image-editing/src/looks.ts`, which the app server sends to Muse Image. The production prompts and question sets live in the Kodio engine. The engine calls Meta's models through the public packages above.

Why private:

- The Kodio engine is Kodio Ltd's private story technology. It existed before this hackathon; this week we rebuilt its story steps on Meta's models.
- The production prompts and question sets were written this week, and are kept private. The code that calls Meta's models with them is the public packages above.
- The organizers allowed keeping a pre-existing platform private as a hosted service, with a note in the README (Kai, Cerebral Valley, 2026-10-26: [message in the hackathon Discord](https://discord.com/channels/1557169028080869426/1564256986848043148/1564310060702896240)).

This repo documents what crosses the boundary: the player API the app calls, and the interface of the public packages. Which Meta model the engine uses at each step is in the table above and in the [how it works](how-it-works.md#how-metas-models-run-inside-the-kodio-engine).

## What you see without the engine

By default the app uses the production engine. Set `EXPO_PUBLIC_ENGINE_URL=""` (quoted) in `apps/native/.env` and the app plays its bundled sample adventure, with no engine. Sign-in and the child's profile still go through the app server (`apps/web`). By default that is the production app server, so a fresh clone needs no `.env`. A self-run app server needs the auth and database values in `apps/web/.env.schema`.

With the engine on, allowlisted accounts get live adventures. Every other account gets a recorded adventure.

An adventure is a fixed map: an intro, 4 places that each teach one fact, and a goodnight that opens after all 4 places.

## Built this week, and what existed before

| Built this week, public (this repo) | Built this week, private | Kodio's proprietary technology (before the hackathon, private) |
| --- | --- | --- |
| The app, the app server and every public package above | The production prompts and question sets | The short clips and the narration |
| Every call to a Meta model | The engine's story steps on Meta's models | |
| The player API client in the app | | |

The commit history of this repo, started Oct 30, 2026, is the record of the public work.
