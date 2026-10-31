# Little Adventures

A story app for children aged 2 to 11 that doubles as a learning platform. The child asks a question out loud ("can we fly to the moon?"), and the story is built around it: narrated, illustrated chapters that star the child's own character. At the end of each chapter the child picks what happens next, so the story follows their curiosity and teaches something real along the way. A parent sits beside them and sets things up in the app.

Website: [littleadventures.app](https://littleadventures.app)

## Built at the Meta Global AI Developer Hackathon

Everything in this repo was written during the hackathon (building period Oct 27 to Nov 4, 2026). This repo was started on Oct 30, 2026, and its commit history is the real record of that work.

This repo is the client. All AI generation happens in a separate backend service. This repo calls no AI model itself.

The Next.js app serves the landing page and a small tRPC API. The Expo app talks only to that API, which holds the landing's waitlist and passes app requests on to the backend service.

```
apps/native (child + parent app) ─► apps/web API (tRPC, /api/trpc) ─► backend service
apps/web (landing page) ──────────┘        └─ Postgres (waitlist)
```

## Apps

| Path | What it is | Stack |
| --- | --- | --- |
| `apps/native` | The app the child and parent use. Runs in the browser first, then ships to iOS from the same code. | Expo, React Native, Uniwind |
| `apps/web` | Public landing page and the tRPC API the app talks to. | Next.js, GSAP, tRPC |
| `packages/api` | tRPC routers (waitlist). | tRPC, Zod |
| `packages/db` | Database schema and client. | Drizzle, Postgres (Neon) |
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

To build for iOS, run `bun run ios` from `apps/native` (needs Xcode).

## Configuration

Each app declares its environment in `.env.schema`, and Varlock generates a typed `src/env.ts` on install (`bun run env:generate` after a schema change). Real values go in ignored `.env` files.

| Variable | App | Value |
| --- | --- | --- |
| `EXPO_PUBLIC_SERVER_URL` | `apps/native` | Base URL of the apps/web API |
| `DATABASE_URL` | `apps/web` | Postgres connection string for the waitlist |

## Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | Start every app |
| `bun run dev:web` | Start the Next.js app |
| `bun run dev:native` | Start the Expo dev server |
| `bun run build` | Build every app |
| `bun run check-types` | Type-check the whole repo |
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
│   ├── api/      # tRPC routers
│   ├── config/   # Shared TypeScript config
│   ├── db/       # Drizzle schema and client
│   └── ui/       # Shared shadcn/ui components and styles
└── PRODUCT.md    # Who it is for and what it must do
```
