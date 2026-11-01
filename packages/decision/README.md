# @little-adventures/decision

Yes/no questions about a JSON state (and optional images), answered as P(yes) with a short reason. Talks to any server that speaks the chat completions protocol; the base URL, key and model id are injected.

```ts
const decision = createDecision({ apiKey, instructions, model });
const result = await decision.decide(state, questionSet, { safetyId });
const outcome = decision.passed(result, questionSet);
```

`decide` never rejects. A missing key, a failing server, a timeout or an unusable answer all give `ran: false`, and the question set's `onUnreachable` policy ("proceed" or "refuse") says what that means.

## Prompts

The package ships no production prompts. The caller injects the `instructions` and the question sets.

## Readout

`readout` chooses where P(yes) comes from.

- `"stated"` (default): one completion answers the whole set. Each question gets a verdict with an answer, a confidence and a reason, and P(yes) is the confidence for a yes or its complement for a no.
- `"answer-token"`: every question is its own completion, run in parallel at temperature 0 with log-probabilities on. The first generated token is expected to be the answer word. P(yes) is the probability of "yes" over the probability of "yes" plus "no" among that token's top candidates (case and surrounding whitespace ignored). The rest of the reply text, after the answer word and its punctuation, is the reason. If neither answer word is among the top candidates, or any request in the set fails, the attempt is unusable. No response format is sent.

`answerTokenMessages({ state, question, instructions, imagesNote, images })` returns the exact system and user messages sent for one question in this mode. Build training data with it so the prompt a model learns from is the prompt it is served.

## Response format

`responseFormat` applies to the `"stated"` readout.

- `"strict-schema"` (default): the reply is constrained to a strict JSON schema.
- `"prompt-only-json"`: no structured output is requested. A line in the prompt asks for the JSON object only, and the reply is parsed leniently: code fences and prose around the object are ignored, and the outermost `{...}` object is read. A reply with no parsable object is an unusable attempt.

## Attempts

`result.attempts` lists every attempt in order, the failed ones included: the model, the time it took, whether it was usable, the tokens it billed, and (for a usable attempt) each question's P(yes). Record one row per attempt from it. `result.usage` and `result.ms` still cover all attempts together.

`maxRetries` (default 1) is how many more attempts follow a failed one, and `timeoutMs` (default 60 s) is how long one request waits.
