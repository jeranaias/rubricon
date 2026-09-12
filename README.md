# 📏 Rubricon

**Turn written standards into behaviorally-anchored rating scales — traceable, and honest about what it can't measure.**

A standard tells you *what* a person must do. It rarely tells you *how to measure* whether they did it
well. Writing that rubric — distinct, observable behavior at each performance tier — is slow, expert
work, done one task at a time.

Rubricon does the first draft. Feed it a standard; it returns a **BARS rubric**: 2–5 observable
dimensions, each with *unsatisfactory / satisfactory / proficient* anchors, and every anchor carries
the **verbatim phrase it came from** so a reviewer can check it in seconds.

And when a standard is too vague to measure honestly — "demonstrate sound leadership" — Rubricon
**refuses to invent criteria** and flags it for a human instead. That refusal is the whole point:
a rubric you can defend, not one that made things up.

```js
import { generateRubric } from 'rubricon';

const rubric = await generateRubric({
  title: 'Defend a Position',
  standard: 'Construct the position for the assigned sector, maintain 360° observation, be prepared to repel an attack.',
  steps: ['Construct primary fighting positions…', 'Camouflage and conceal…', 'Maintain observation…'],
});
```

```jsonc
{
  "flagged": false,
  "dimensions": [
    {
      "name": "Position Construction & Camouflage",
      "source": "Construct primary fighting position(s)… Camouflage and conceal…",
      "anchors": {
        "unsatisfactory": "Leaves the position visible to the front for lack of camouflage.",
        "satisfactory":   "Completes the fighting position and breaks up its outline.",
        "proficient":     "Renders the position indistinguishable from the surrounding terrain."
      }
    }
  ]
}
```

A vague standard comes back honest instead:

```jsonc
{ "flagged": true,
  "reason": "Rests on 'sound' and 'satisfactory' with no observable behavior.",
  "needsSME": "Define the observable indicators of discipline and leadership an evaluator can verify." }
```

## Use it

```bash
# library
npm install rubricon

# or from the terminal
export RUBRICON_API_KEY=...        # any OpenAI-compatible key (OpenRouter by default)
npx rubricon example/task.json
```

## The task shape

```jsonc
{
  "code": "…", "title": "…",
  "condition": "Given …",
  "standard": "…",                 // the sentence(s) that define proficiency
  "steps": ["…", "…"]              // performance steps (optional but helps)
}
```

## Bring your own model

Configure by environment — no lock-in:

| Variable | Default |
|---|---|
| `RUBRICON_API_KEY` | *(required; `OPENROUTER_API_KEY` also accepted)* |
| `RUBRICON_ENDPOINT` | `https://openrouter.ai/api/v1/chat/completions` |
| `RUBRICON_MODEL` | `google/gemini-3-flash-preview` |

Any OpenAI-compatible chat endpoint works — point it wherever you like.

## Output is review-ready

Structured JSON so a human can inspect, edit, approve, or reject each anchor — and so a set of
generated rubrics can be run through inter-rater reliability testing (Cohen's κ / Krippendorff's α).

## License

Apache-2.0.
