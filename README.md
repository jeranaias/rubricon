# 📏 Rubricon

[![CI](https://github.com/jeranaias/rubricon/actions/workflows/ci.yml/badge.svg)](https://github.com/jeranaias/rubricon/actions/workflows/ci.yml) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**Turn written standards into behaviorally-anchored rating scales — then prove they're grounded and measure whether people agree on them.**

A standard tells you *what* someone must do. It rarely tells you *how to measure* whether they did it
well. Rubricon closes that gap end to end:

1. **Generate** a BARS rubric from a standard — observable anchors at each tier, each traceable to the source.
2. **Verify** that every anchor's cited phrase is *actually in the source* — not a plausible hallucination.
3. **Measure** how much your raters agree once they use it — Cohen's κ, weighted κ, Fleiss' κ.

Most tools stop at step 1 and ask you to trust the model. Rubricon does the two hard parts that make a
rubric *defensible*.

---

## 1 · Generate

```js
import { generateRubric } from 'rubricon';

const rubric = await generateRubric({
  title: 'Handle an Escalated Customer Call',
  standard: 'Verify the customer\'s identity, acknowledge the problem, resolve within policy or escalate, and confirm the next steps before ending the call.',
  steps: ['Verify the caller\'s identity…', 'Acknowledge and restate the problem…', 'Apply the refund policy or escalate…'],
});
```

Each dimension comes back with *unsatisfactory / satisfactory / proficient* anchors and the **verbatim
phrase** it derives from. And when a standard is too vague to measure honestly — "demonstrate a
positive attitude" — Rubricon **refuses to invent criteria** and flags it for a human instead:

```jsonc
{ "flagged": true,
  "reason": "Rests on 'positive' with no observable behavior an evaluator could rate.",
  "needsSME": "Define the observable indicators of attitude an evaluator can verify from the outside." }
```

## 2 · Verify it's actually grounded

A model can *claim* an anchor traces to the source and quietly fabricate the phrase. Don't trust —
check:

```js
import { verifyTraceability, validateRubric } from 'rubricon';

const v = verifyTraceability(rubric, standardText);
// → { grounded: true, coverage: 1.0,
//     dimensions: [{ name, source, grounded: true, method: 'substring', score: 1 }],
//     ungrounded: [] }
```

Every anchor's source phrase is checked against the real text — as a substring, or by strong token
overlap — and anything that can't be confirmed lands in `ungrounded`. `validateRubric` separately
catches malformed output: missing tiers, no source, or tiers that don't actually differ.

## 3 · Measure rater agreement

A rubric is only as good as the agreement it produces. Feed Rubricon two (or more) raters' scores and
it does the psychometrics — chance-corrected, and ordinal-aware because "off by one tier" isn't "totally wrong":

```js
import { reliabilityReport, weightedKappa, fleissKappa } from 'rubricon';

reliabilityReport(raterA, raterB);
// → { n: 30, percentAgreement: 0.83, cohenKappa: 0.71,
//     weightedKappa: 0.79, interpretation: 'substantial' }

fleissKappa(panelRatings); // 3+ raters, one row per item
```

Tier labels (`'proficient'`) or plain numbers both work. Weighted κ gives partial credit for
one-tier-off; the report includes the Landis & Koch interpretation.

> **Ordinal caveat — weighted κ needs to know the tier order.** Unlike the unweighted stats, weighted
> κ scores a disagreement by *how many tiers apart* the two ratings are, so the category order is
> load-bearing. Rubricon never guesses it alphabetically (which would rank `proficient < satisfactory
> < unsatisfactory` — the scale reversed). It orders **numeric** scores numerically, **canonical
> tier labels** through `TIERS`, and for **any other labels requires an explicit order**:
>
> ```js
> weightedKappa(a, b, { categories: ['low', 'medium', 'high'] }); // labels not in TIERS → say the order
> ```
>
> Passing such labels with no `categories` throws rather than returning a wrong number.

> **Degenerate input.** When every rating is the same single category there is no variance to
> chance-correct, so `cohenKappa`, `weightedKappa`, and `fleissKappa` return **`NaN`** (not a
> misleading `1`), and `interpretKappa(NaN)` is `'undefined'`.

---

## Install & test

```bash
npm install rubricon
export RUBRICON_API_KEY=...    # any OpenAI-compatible key (OpenRouter by default). Only generate() needs it.
npx rubricon example/task.json # generate a rubric from a task
npm test                       # the verification + reliability math is fully unit-tested
```

> `verifyTraceability`, `validateRubric`, and every reliability function are **pure** — no API key, no
> network. Only `generateRubric` calls a model.

## Bring your own model

| Variable | Default |
|---|---|
| `RUBRICON_API_KEY` | *(required for `generateRubric`; `OPENROUTER_API_KEY` also accepted)* |
| `RUBRICON_ENDPOINT` | `https://openrouter.ai/api/v1/chat/completions` |
| `RUBRICON_MODEL` | `google/gemini-3-flash-preview` |

## API

| Function | Does |
|---|---|
| `generateRubric(task)` | standard → BARS rubric (or a flag). Needs a model key. |
| `taskToText(task)` | flatten a standard object into the source text used above |
| `verifyTraceability(rubric, sourceText, opts?)` | confirm each anchor's phrase is really in the source |
| `validateRubric(rubric)` | structural checks: tiers present, distinct, sourced |
| `percentAgreement(a, b)` | raw fraction of items two raters scored identically |
| `cohenKappa(a, b)` | chance-corrected agreement for two raters |
| `weightedKappa(a, b, opts?)` | ordinal kappa — partial credit for one-tier-off (needs a tier order: numbers, `TIERS` labels, or explicit `opts.categories`) |
| `fleissKappa(ratings)` | chance-corrected agreement for a panel of 3+ raters |
| `interpretKappa(k)` | Landis & Koch label for a kappa value (`'undefined'` for non-finite κ) |
| `reliabilityReport(a, b, opts?)` | one-call agreement summary + interpretation |
| `TIERS` | canonical tier→ordinal map (`unsatisfactory`/`satisfactory`/`proficient`) |

## License

Apache-2.0.
