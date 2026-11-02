# Little Adventures

A story app for children aged 2 to 11 that doubles as a learning platform. The child asks a question out loud ("can we fly to the moon?"), and the story is built around it: narrated, illustrated chapters that star the child's own character. At the end of each chapter the child picks what happens next, so the story follows their curiosity and teaches something real along the way. A parent sits beside them and sets things up in the app.

Website: [littleadventures.app](https://littleadventures.app)

## Built at the Meta Global AI Developer Hackathon

Everything in this repo was written during the hackathon (building period Oct 27 to Nov 4, 2026). This repo was started on Oct 30, 2026, and its commit history is the real record of that work.

This repo holds the app, the app server and the public packages that make every Meta model call (Muse Spark, Muse Image, SAM 3.1, Muse Voice Transcribe). All of it was written this week. The production prompts, plus the video and voice production, live in a private engine at engine.littleadventures.app. The engine runs on our startup's proprietary technology, which existed before the hackathon. That technology uses Meta's models, through the public packages in this repo; how it uses them is what we cannot disclose during the hackathon. [ARCHITECTURE.md](ARCHITECTURE.md) shows the split and why.

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
