// Rubricon — turn a written standard into a Behaviorally Anchored Rating Scale (BARS).
// Every anchor is traceable to the source text; standards too vague to measure are flagged for a
// human rather than filled with invented criteria. Bring your own model via an OpenAI-compatible
// chat endpoint (defaults to OpenRouter).
const ENDPOINT = process.env.RUBRICON_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.RUBRICON_MODEL || 'google/gemini-3-flash-preview';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(system, user, tries = 4, timeoutMs = 90000) {
  const KEY = process.env.RUBRICON_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!KEY) return { error: 'set RUBRICON_API_KEY (or OPENROUTER_API_KEY)' };
  for (let a = 1; a <= tries; a++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, temperature: 0.15, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
      if ((res.status === 429 || res.status === 503) && a < tries) { await sleep(3000 * a); continue; }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const t = (await res.json()).choices?.[0]?.message?.content ?? '';
      try { return JSON.parse(t); } catch {}
      const m = t.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch {} }
      return { error: 'no-json' };
    } catch (e) {
      if (a < tries) { await sleep(3000 * a); continue; }
      return { error: e?.name === 'AbortError' ? 'timeout' : String(e) };
    } finally { clearTimeout(timer); }
  }
  return { error: 'failed' };
}

// Render a task/standard object into a single text blob.
function taskToText(task) {
  const steps = (task.performanceSteps || task.steps || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n');
  return [
    task.code ? `Code: ${task.code}` : '',
    task.title ? `Title: ${task.title}` : '',
    task.condition ? `Condition: ${task.condition}` : '',
    task.standard ? `Standard: ${task.standard}` : '',
    steps ? `Performance steps:\n${steps}` : '',
    task.references ? `References: ${task.references}` : '',
  ].filter(Boolean).join('\n');
}

const SYSTEM = `You are an assessment subject-matter expert building a Behaviorally Anchored Rating Scale (BARS) from a single performance standard.

HARD RULES:
- Use ONLY the provided text (condition, standard, steps). Every anchor must be grounded in and traceable to it.
- NEVER invent times, distances, counts, or criteria not present in the text.
- Decompose the standard into 2-5 OBSERVABLE performance dimensions an evaluator could rate from the sidelines.
- For each dimension, write three behavioral anchors describing what the evaluator would SEE at each tier: "unsatisfactory", "satisfactory", "proficient". Concrete and clearly distinguishable — never vague adjectives like "good".
- For each dimension include "source": a short verbatim phrase copied from the text it derives from.
- FLAG-AMBIGUOUS: if the standard is too subjective to yield objective, observable anchors, DO NOT invent criteria. Output {"flagged":true,"reason":"...","needsSME":"<what a human must define to make it measurable>"}.

Output JSON only, one of:
{"flagged":false,"dimensions":[{"name":"...","source":"<verbatim>","anchors":{"unsatisfactory":"...","satisfactory":"...","proficient":"..."}}],"notes":["optional"]}
OR
{"flagged":true,"reason":"...","needsSME":"..."}`;

/** Generate a BARS rubric for one standard/task object. */
export async function generateRubric(task) {
  const text = taskToText(task);
  const r = await ask(SYSTEM, `Standard:\n${text}\n\nProduce the BARS rubric per the rules.`);
  if (r.error) return { error: r.error, task: { code: task.code, title: task.title } };
  return { ...r, task: { code: task.code, title: task.title } };
}

export { taskToText };
