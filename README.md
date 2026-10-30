# Little Adventures

A story app for children aged 2 to 11 that doubles as a learning platform. The child asks a question out loud ("can we fly to the moon?"), and the story is built around it: narrated, illustrated chapters that star the child's own character. At the end of each chapter the child picks what happens next, so the story follows their curiosity and teaches something real along the way. A parent sits beside them, sets things up, and sees past stories in a dashboard.

Website: [littleadventures.app](https://littleadventures.app)

## Built at the Meta Global AI Developer Hackathon

Everything in this repo was written during the hackathon (building period Oct 27 to Nov 4, 2026). This repo was started on Oct 30, 2026, and its commit history is the real record of that work.

This repo is the client. All AI generation happens in a separate backend service, which this repo reaches only through its player API. This repo calls no AI model itself.

```
apps/native (child + parent app) ─┐
                                  ├─► player API (/api/v1) ─► backend service
apps/web (landing + dashboard) ───┘
```

## Apps

| Path | What it is | Stack |
| --- | --- | --- |
| `apps/native` | The app the child and parent use. Runs in the browser first, then ships to iOS from the same code. | Expo, React Native, Uniwind |
| `apps/web` | Public landing page and the parent dashboard. | Next.js |
| `packages/ui` | Shared web UI primitives. | shadcn/ui, Tailwind CSS |
| `packages/config` | Shared TypeScript config. | |

## Run it

Needs Node 24 (pinned in `.nvmrc`) and bun.

```bash
nvm use
bun install
bun run dev:web      # landing + dashboard on http://localhost:3001
bun run dev:native   # Expo dev server, press w to open the app in the browser
```

To build for iOS, run `bun run ios` from `apps/native` (needs Xcode).

## Configuration

Each app declares its environment in `.env.schema`, and Varlock generates a typed `src/env.ts` on install (`bun run env:generate` after a schema change). Real values go in ignored `.env` files.

| Variable | App | Value |
| --- | --- | --- |
| `EXPO_PUBLIC_SERVER_URL` | `apps/native` | Base URL of the backend API |

## Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | Start every app |
| `bun run dev:web` | Start the Next.js app |
| `bun run dev:native` | Start the Expo dev server |
| `bun run build` | Build every app |
| `bun run check-types` | Type-check the whole repo |
| `bunx ultracite check` / `bunx ultracite fix` | Lint and format (Biome) |

A Husky pre-commit hook runs lint-staged with Ultracite on staged files.

## Project structure

```
little-adventures/
├── apps/
│   ├── native/   # Expo app (web first, then iOS)
│   └── web/      # Next.js landing page and parent dashboard
├── packages/
│   ├── config/   # Shared TypeScript config
│   └── ui/       # Shared shadcn/ui components and styles
└── PRODUCT.md    # Who it is for and what it must do
```
