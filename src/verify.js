// Grounding verification for generated rubrics.
//
// A model can *claim* an anchor traces to the source and quietly fabricate the phrase it cites.
// verifyTraceability checks every dimension's `source` against the actual standard text — as a
// substring, or by strong token overlap — and flags any anchor whose grounding can't be confirmed.
// This is the difference between "the model said it's grounded" and "we checked."

// Unicode-aware: keep letters and numbers of ANY script (\p{L}\p{N}), not just ASCII a-z0-9,
// so grounding works for non-English standards (accented, Arabic, CJK, Cyrillic, …).
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('a an the of to and or in on for with by is are be as at from that this it its into their your you we they them his her'.split(' '));
const contentTokens = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

// A source phrase must carry at least this many content tokens to ground anything. A lone word
// ("identity") is too generic to confirm an anchor traces to the standard — substring or not.
const MIN_GROUND_TOKENS = 2;

function overlap(phrase, text) {
  const p = new Set(contentTokens(phrase));
  if (!p.size) return 0;
  const t = new Set(contentTokens(text));
  let hit = 0;
  for (const w of p) if (t.has(w)) hit++;
  return hit / p.size;
}

/**
 * Verify each anchor's cited source phrase is actually present in the standard text.
 * @param {object} rubric  the output of generateRubric (with .dimensions)
 * @param {string} sourceText  the original standard/task text the rubric was built from
 * @param {{ threshold?: number }} [opts]  token-overlap threshold when not an exact substring (default 0.6)
 * @returns {{ grounded: boolean, coverage: number, dimensions: object[], ungrounded: object[] }}
 */
export function verifyTraceability(rubric, sourceText, opts = {}) {
  const threshold = opts.threshold ?? 0.6;
  const text = norm(sourceText);
  const dims = (rubric && rubric.dimensions) || [];
  const checked = dims.map((d) => {
    const src = d.source || '';
    const nsrc = norm(src);
    let grounded = false, method = 'none', score = 0;
    // Too-thin a source phrase cannot ground an anchor, by either method.
    if (contentTokens(src).length < MIN_GROUND_TOKENS) { /* leave ungrounded */ }
    else if (nsrc && text.includes(nsrc)) { grounded = true; method = 'substring'; score = 1; }
    else { score = overlap(src, sourceText); if (score >= threshold) { grounded = true; method = 'overlap'; } }
    return { name: d.name, source: src, grounded, method, score: Math.round(score * 100) / 100 };
  });
  const ungrounded = checked.filter((c) => !c.grounded);
  return {
    grounded: ungrounded.length === 0,
    coverage: dims.length ? Math.round(((dims.length - ungrounded.length) / dims.length) * 100) / 100 : 1,
    dimensions: checked,
    ungrounded,
  };
}

/**
 * Structural validation: every dimension has the three tiers, a source, and tiers that differ.
 * Catches malformed or degenerate rubrics before a human ever looks at them.
 */
export function validateRubric(rubric) {
  const issues = [];
  if (!rubric || rubric.flagged) return { valid: true, flagged: !!(rubric && rubric.flagged), issues };
  const dims = rubric.dimensions || [];
  if (!dims.length) issues.push('no dimensions');
  dims.forEach((d, i) => {
    const a = d.anchors || {};
    for (const tier of ['unsatisfactory', 'satisfactory', 'proficient']) {
      if (!a[tier] || !String(a[tier]).trim()) issues.push(`dimension ${i + 1} (${d.name || '?'}) missing "${tier}" anchor`);
    }
    if (!d.source) issues.push(`dimension ${i + 1} (${d.name || '?'}) has no source phrase`);
    const vals = ['unsatisfactory', 'satisfactory', 'proficient'].map((t) => norm(a[t]));
    // Every pair must differ — including unsatisfactory vs. proficient (the ends), which a simple
    // adjacent-only check misses. Only compare tiers that are actually present (non-empty).
    if ([[0, 1], [1, 2], [0, 2]].some(([x, y]) => vals[x] && vals[y] && vals[x] === vals[y]))
      issues.push(`dimension ${i + 1} (${d.name || '?'}) has indistinct tiers`);
  });
  return { valid: issues.length === 0, flagged: false, issues };
}
