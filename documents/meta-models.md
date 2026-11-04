# Meta models

<p align="center"><img src="../.github/readme/meta-models.webp" alt="Six Meta models in every story: an exploded view with the Little Adventures app on top; below it Meta open weights, our tuned Muse Glimmer 30B with its LoRA (checks every story, 94.5% vs 89.8%) and Muse Spark Open (its backup); at the base the Meta Model API with Muse Voice Transcribe 1.0, Muse Spark 1.3, Muse Image 1.0 and SAM 3.1, each with its job." width="100%"></p>

| Model | Job | Code | Runs |
| --- | --- | --- | --- |
| Muse Spark 1.3 | Structured output (`llm`) and yes/no checks (`decision`). The engine uses both to write and check the map. | [packages/llm](../packages/llm), [packages/decision](../packages/decision) | Meta Model API |
| Muse Image 1.0 | Draws the hero's looks from the child's photo, and the cast. | [packages/image-editing](../packages/image-editing) | Meta Model API |
| SAM 3.1 | Cuts the person, or a named object, out of a photo. | [packages/image-editing](../packages/image-editing) | Meta Model API |
| Muse Voice Transcribe 1.0 | Turns the child's spoken question into text. | [packages/transcribe](../packages/transcribe) | Meta Model API |
| Muse Glimmer 30B + our LoRA | The story checker. `decision` talks to it through its `baseUrl` and `model` options and, with `readout: "answer-token"`, reads yes/no probabilities from the logprobs of the first answer token. | [packages/decision](../packages/decision) | Served on Modal |
| Muse Spark Open | Fallback checker when the tuned model is asleep. | [packages/decision](../packages/decision) | Served on Baseten |

Not used: Muse Wonder, Muse Code.

Where each model works, step by step:

<p align="center"><img src="../.github/readme/models-grid.webp" alt="Grid of the six Meta models against the five steps of an adventure: Muse Voice Transcribe at Ask; Muse Image and SAM 3.1 at Photo and Draw; Muse Spark 1.3 at Ask and Write; the tuned Muse Glimmer at Check, with Muse Spark Open as its backup." width="100%"></p>

How we trained the checker, and its results: [training.md](training.md).

## Field notes

What we learned calling Muse Image 1.0 and SAM 3.1. The code is in [packages/image-editing](../packages/image-editing).

- **People, yes. Props, no.** SAM 3.1 found the person in a photo reliably. In a trial of about 25 calls on generated props (mushrooms, lanterns, stars), most found nothing or only part of the object.
- **`size` is an aspect ratio.** We asked Muse Image for 780x1688 and got 1072x2320. Do not assume the pixels you ask for.
- **Edits take objects.** `images` must be `[{ image_url }]`. A bare list of URL strings is rejected. Our wrapper in [index.ts](../packages/image-editing/src/index.ts) does this for you.
- **A mask covers only its box.** SAM's mask is the size of the box it found, not of the photo. The cutout code stretches it back over the box with a nearest-neighbour resize, in [cutout.ts](../packages/image-editing/src/cutout.ts).
- **Rotate phone photos first.** They carry an EXIF orientation. The cutout code rotates before it places the mask.
- **Cost, and no retries.** One SAM call is $0.0025. One Muse Image call is $0.01. A call that fails is not retried, because a retry is billed again, and each call has a 100 s timeout. Every call is recorded with its cost in [art.ts](../packages/api/src/art.ts).
- **Clouds from Muse Image.** The cloud sprites in the sky are Muse Image clouds drawn on flat black. Their brightness becomes their transparency, so the soft edges stay. The sprites are in [packages/native-ui/assets/sky](../packages/native-ui/assets/sky).
