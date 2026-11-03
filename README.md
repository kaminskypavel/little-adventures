# Little Adventures

<p align="center"><img src=".github/readme/hero.webp" alt="Little Adventures: a bedtime adventure built around your child's own question. Two children on a moon with Saturn behind them, beside three phones showing the app." width="100%"></p>

<p align="center"><b>A bedtime adventure built around your child's own question.</b><br>For children aged 2 to 16, written for their age. Built on six Meta models.</p>

<p align="center"><a href="https://www.littleadventures.app/web"><img src="https://img.shields.io/badge/Live%20app-littleadventures.app%2Fweb-1d2b4f" alt="Live app"></a> <a href="https://www.youtube.com/watch?v=ofxkeGxQeOU"><img src="https://img.shields.io/badge/Launch%20film-YouTube-c4302b" alt="Launch film on YouTube"></a> <a href="https://x.com/KaminskyPavel/status/2117210112993755191"><img src="https://img.shields.io/badge/Launch%20film-on%20X-000000" alt="Launch film on X"></a> <a href="https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures"><img src="https://img.shields.io/badge/Hugging%20Face-glimmer--decision--little--adventures-FFD21E" alt="Open weights on Hugging Face"></a></p>

<p align="center"><img src=".github/readme/screens.webp" alt="Four app screens: the child's question confirmed, the adventure being made with the child's clay look on the hill, a place being read aloud word by word, and the adventure map." width="100%"></p>

<p align="center">One clay world on every screen: our own design system, the star, the puppy, and your child as the hero.</p>

<p align="center"><a href="https://www.youtube.com/watch?v=ofxkeGxQeOU"><img src=".github/readme/launch-film.webp" alt="Little Adventures launch film: two children and the star look at a glowing phone. Click to watch the 45-second film." width="80%"></a></p>

## Built on six Meta models

<p align="center"><img src=".github/readme/meta-models.webp" alt="Six Meta models in every story: an exploded view with the Little Adventures app on top; below it Meta open weights, our tuned Muse Glimmer 30B with its LoRA (checks every story, 94.5% vs 89.8%) and Muse Spark Open (its backup); at the base the Meta Model API with Muse Voice Transcribe 1.0, Muse Spark 1.3, Muse Image 1.0 and SAM 3.1, each with its job." width="100%"></p>

<p align="center"><a href="documents/meta-models.md">Every model, its job and its code</a></p>

## How an adventure is made

<p align="center"><img src=".github/readme/adventure-flow.svg" alt="Flow diagram: the child asks out loud; the app server turns speech into text with Muse Voice Transcribe and the photo into looks with Muse Image and SAM 3.1; inside the Kodio engine Muse Spark 1.3 writes the map, the tuned Muse Glimmer checks it and sends it back with reasons, Muse Image and SAM 3.1 draw the cast, and the map plays in the app." width="100%"></p>

<p align="center"><a href="documents/how-it-works.md">Step by step</a> · <a href="ARCHITECTURE.md">Architecture</a></p>

## The checker we trained

<p align="center"><img src=".github/readme/checker-loop.webp" alt="The checker loop: Muse Spark 1.3 writes the map, our tuned Muse Glimmer 30B answers yes or no on every check, a no goes back with a reason, a yes goes on to Muse Image and SAM 3.1, and Muse Spark Open stands in while Glimmer wakes. Below: 94.5% mean balanced accuracy against 89.8% for Muse Spark 1.3, four times faster, and two frontier models beaten at high reasoning effort." width="100%"></p>

<p align="center"><b><a href="https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures">Model card on Hugging Face</a></b> · <a href="documents/training.md">How we trained it</a> · <a href="benchmarks/checker">Replay the results offline</a></p>

## Hackathon submission

| | |
| --- | --- |
| Event | Meta Global AI Hackathon 2026 |
| Track | **Startup** (Kodio Ltd) |
| Problem statement | **Build for Your World** |
| Best Build on Meta Open Weight Models | Our LoRA on Muse Glimmer 30B checks every story ([training](documents/training.md)) |
| Best Creative Build | Muse Image and SAM 3.1 make the child the hero ([packages/image-editing](packages/image-editing)) |
| Best Agentic Use-Case | Write, check, rewrite with reasons, stop after two failed rounds ([packages/decision](packages/decision)) |
| Demo video (3 min) | Added on submission day |
| Try it | [littleadventures.app/web](https://www.littleadventures.app/web), a private beta: the invite code is in our submission form. Or [run it](#run-it) with no keys |
| Provenance | Repo started Oct 30, 2026, inside the building period. The Kodio engine runs on Kodio Ltd's pre-existing technology ([ARCHITECTURE.md](ARCHITECTURE.md)) |

## For judges

| Pillar | Where to look |
| --- | --- |
| Impact (30%) | [PRODUCT.md](PRODUCT.md), [A child's data](documents/childs-data.md), [Limits](documents/limits.md) |
| Use of Meta AI tooling (25%) | [Meta models](documents/meta-models.md), [How it works](documents/how-it-works.md), [Training](documents/training.md), [benchmarks/checker](benchmarks/checker) |
| Technical depth (20%) | [ARCHITECTURE.md](ARCHITECTURE.md), [packages/decision](packages/decision), [.github/workflows](.github/workflows) |
| Demo (25%) | The demo video above, [Run it](#run-it), the smoke test [apps/native/e2e/smoke.spec.ts](apps/native/e2e/smoke.spec.ts) |

## Run it

```bash
bun install
bun run dev:native   # press w: the app plays a bundled sample adventure, no keys needed
```

Setup, configuration, scripts and the project layout: [documents/development.md](documents/development.md).

## Documents

| | |
| --- | --- |
| [How it works](documents/how-it-works.md) | One adventure, step by step, and how Meta's models run inside the Kodio engine |
| [Meta models](documents/meta-models.md) | Every Meta model, its job, its code and where it runs |
| [Training](documents/training.md) | How we trained and use the Muse Glimmer checker, with the full results |
| [A child's data](documents/childs-data.md) | The photo, the voice, what each Meta call sees, deleting |
| [Limits](documents/limits.md) | What it does not do yet |
| [Development](documents/development.md) | Apps, setup, configuration, prompts, scripts, structure |
| [ARCHITECTURE.md](ARCHITECTURE.md) | The public and private split, for judges |
| [PRODUCT.md](PRODUCT.md) | Who it is for and what it must do |

<p align="center"><a href="https://littleadventures.app">littleadventures.app</a> · Licence: evaluation only, see <a href="LICENSE">LICENSE</a> · Kodio Ltd</p>
