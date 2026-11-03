# Checker benchmark: replay it offline

Little Adventures checks every story plan before it becomes a bedtime story. The checker is a fine-tuned Muse Glimmer 30B. This folder holds the per-row results of its held-out benchmark and a script that recomputes every published number in about a second, with no network and no key.

Model: https://huggingface.co/kaminskypavel/glimmer-decision-little-adventures

```sh
bun run eval:checker           # from the repo root
bun test benchmarks/checker    # the metric tests
```

## What the checker decides

For each check it gives one yes/no answer, read from the probability of the first generated token (P(yes)). At P(yes) of 0.5 or more the answer is "yes". Most checks pass on "yes"; the two risk checks (`scaryOrUnsafe`, `unsafeTopic`) pass on "no".

| Check id | In plain words |
|---|---|
| `ageFitCalm` | Calm for the child's age |
| `namesConsistent` | Names stay consistent |
| `oneFactPerPlace` | One fact per place |
| `outroRecaps` | Goodnight recaps the facts |
| `scaryOrUnsafe` | Nothing scary or unsafe |
| `factsTrue` | Facts are true |
| `factsAnswerQuestion` | Facts answer the question |
| `bedtimeFit` | Question suits a bedtime story |
| `unsafeTopic` | Topic is safe for a young child |

The first seven run on a story plan (a full check is 7 questions). The last two run on the child's question, before any plan exists.

## The held-out set

1,498 rows: 1,428 story-plan rows (204 plans, 7 checks each) and 70 question rows (35 questions, 2 checks each). 1,307 rows should pass and 191 should fail.

- Plans and questions are synthetic, written by Muse Spark models. No data from real children is used anywhere.
- A row's label comes from how it was built: a clean plan passes; the same plan broken in one named way (one false fact, one wrong name, a missing recap, and so on) fails the check that break targets.
- The set was held out from training. The tuned models never saw these plans.
- Production prompts, question wording, plan texts and model replies are a trade secret and are not published. The data keeps only what scoring needs: an opaque row id, the check id, the label, and each system's P(yes).

## Files

- `results.csv`: one line per row and system. Columns: `state` (opaque plan or question id; for plans the suffix names how the plan was built), `check`, `label` (`pass` or `fail`), `system`, `p_yes` (rounded to 4 decimals; no answer changes by rounding).
- `latency.json`: 20 timed full checks per system, and how they were measured.
- `eval.ts`: the replay. `eval.test.ts`: hand-checked tests of balanced accuracy, the Wilson interval and the McNemar test.

Systems in `results.csv`: `tunedV1` and `tunedV2` (Muse Glimmer 30B with our v1 and v2 adapters), `glimmer` (the base model), `sparkOpen` (Muse Spark Open), `spark13` (Muse Spark 1.3). The two hybrids in the table are computed by `eval.ts`: the tuned model's answers, with Muse Spark Open's for `factsTrue` and `factsAnswerQuestion`.

## Output

Balanced accuracy is the mean of the recall on passing rows and the recall on failing rows. The top row is the mean of the nine per-check balanced accuracies. "Catches" is the share of the 191 failing rows flagged; "False alarms" is the share of the 1,307 passing rows flagged. Bold marks the best value in a row.

| Check | Tuned Glimmer v1 + Spark Open | Tuned Glimmer v2 + Spark Open | Tuned Glimmer v2 | Tuned Glimmer v1 | Muse Spark 1.3 | Muse Spark Open | Base Muse Glimmer |
|---|---|---|---|---|---|---|---|
| All checks, mean balanced accuracy | **96.8%** | 94.0% | 94.5% | 86.9% | 89.8% | 88.0% | 81.6% |
| Calm for the child's age (`ageFitCalm`) | **100%** | **100%** | **100%** | **100%** | 99.7% | 99.7% | 92.4% |
| Names stay consistent (`namesConsistent`) | **100%** | 98.5% | 98.5% | **100%** | 98.8% | 98.2% | 87.1% |
| One fact per place (`oneFactPerPlace`) | **100%** | **100%** | **100%** | **100%** | 81.3% | 65.9% | 48.5% |
| Goodnight recaps the facts (`outroRecaps`) | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** | 99.7% |
| Nothing scary or unsafe (`scaryOrUnsafe`) | **100%** | **100%** | **100%** | **100%** | 97.9% | 95.8% | 95.6% |
| Facts are true (`factsTrue`) | 97.8% | 97.8% | 93.5% | 50.0% | **99.4%** | 97.8% | 80.4% |
| Facts answer the question (`factsAnswerQuestion`) | 91.5% | 91.5% | **100%** | 50.0% | 95.8% | 91.5% | 58.7% |
| Question suits a bedtime story (`bedtimeFit`) | **93.2%** | 86.4% | 86.4% | **93.2%** | 59.1% | 61.4% | 88.6% |
| Topic is safe for a young child (`unsafeTopic`) | **88.9%** | 72.2% | 72.2% | **88.9%** | 75.9% | 81.4% | 83.3% |
| Catches, 191 failing rows | **97.4%** | 93.7% | 92.1% | 70.7% | 86.4% | 85.3% | 77.0% |
| False alarms, 1,307 passing rows | 2.9% | 2.9% | 0.1% | **0%** | 2.4% | 3.7% | 9.9% |
| Speed, full 7-question check, warm | 2.07 s | 1.85 s | 1.05 s | **0.85 s** | 4.49 s | 3.04 s | 8.92 s |

The script then prints two paired comparisons on overall accuracy (share of the 1,498 rows answered correctly), with a 95% Wilson interval for each system and an exact McNemar test on the rows where the two systems disagree:

```
Paired comparisons on overall accuracy (all 1498 rows, every check):

Tuned Glimmer v2 vs Muse Spark 1.3
- Tuned Glimmer v2: 1482/1498 right = 98.9%, 95% Wilson interval 98.3% to 99.3%
- Muse Spark 1.3: 1441/1498 right = 96.2%, 95% Wilson interval 95.1% to 97.1%
- Exact McNemar test, same 1498 rows: only Tuned Glimmer v2 right on 49, only Muse Spark 1.3 right on 8, p = 2.72e-8

Tuned Glimmer v1 + Spark Open vs Muse Spark 1.3
- Tuned Glimmer v1 + Spark Open: 1455/1498 right = 97.1%, 95% Wilson interval 96.2% to 97.9%
- Muse Spark 1.3: 1441/1498 right = 96.2%, 95% Wilson interval 95.1% to 97.1%
- Exact McNemar test, same 1498 rows: only Tuned Glimmer v1 + Spark Open right on 40, only Muse Spark 1.3 right on 26, p = 0.1089
```

Reading it: the v2 adapter alone beats Muse Spark 1.3 on overall accuracy with a very small p-value. The hybrid (v1 adapter plus Muse Spark Open on the two fact checks) leads on mean balanced accuracy, but its raw-accuracy gap to Muse Spark 1.3 is not significant (p = 0.11), because most rows are passing rows and balanced accuracy weights the failing ones equally.

## Caveats

- The hybrid's routing (which checks go to Muse Spark Open) was chosen after seeing results on this test set. Treat its number as optimistic. The v1 adapter alone says "yes" to every `factsTrue` and `factsAnswerQuestion` row (50% balanced accuracy on both), which is why the hybrid exists.
- The 1,498 rows are not independent: the seven checks of one plan share that plan, and the plans are synthetic. The intervals and p-values treat rows as independent, so they are somewhat too tight.
- P(yes) is not calibrated. For the tuned models it is the first-token probability; for the other systems it is the confidence they state. Only the 0.5 threshold is used here.
- Latency is warm: the GPU was already awake, 2 warm-up checks were discarded, and the figure is the median of 20 full checks run one after another. It excludes GPU wake-up and the idle tail. Per-row timings were not recorded, so `latency.json` is a constant carried from the run, not something this script can recompute from rows.
- This replays the published scoring from the published per-row answers. It does not re-run any model; the model weights and prompts are not part of this repo.
