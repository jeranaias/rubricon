// Inter-rater reliability — the math assessment teams actually need once a rubric exists.
// Give it two (or more) raters' scores for the same items and it tells you how much they agree,
// correcting for chance. Tier labels ("unsatisfactory" | "satisfactory" | "proficient") or plain
// numbers both work; ordinal weighting is available because "off by one tier" isn't "totally wrong".

export const TIERS = { unsatisfactory: 0, satisfactory: 1, proficient: 2 };

function assertPair(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) throw new Error('raters must be arrays');
  if (a.length !== b.length || !a.length) throw new Error('raters must be equal, non-empty length');
}

function categoriesOf(...cols) {
  const set = new Set();
  cols.forEach((c) => c.forEach((v) => set.add(v)));
  return [...set].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
}

/**
 * Raw fraction of items two raters scored identically (observed agreement, not chance-corrected).
 * @param {Array} a  first rater's scores (labels or numbers)
 * @param {Array} b  second rater's scores, same length as `a`
 * @returns {number} agreement in [0, 1]
 */
export function percentAgreement(a, b) {
  assertPair(a, b);
  let hit = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) hit++;
  return hit / a.length;
}

/**
 * Cohen's kappa (unweighted) for two raters. Ranges from -1 to 1; ~0 is chance, 1 is perfect.
 * @param {Array} a  first rater's scores (labels or numbers)
 * @param {Array} b  second rater's scores, same length as `a`
 * @returns {number} kappa in [-1, 1]
 */
export function cohenKappa(a, b) {
  assertPair(a, b);
  const cats = categoriesOf(a, b);
  const n = a.length;
  const pA = {}, pB = {};
  cats.forEach((c) => { pA[c] = 0; pB[c] = 0; });
  for (let i = 0; i < n; i++) { pA[a[i]]++; pB[b[i]]++; }
  cats.forEach((c) => { pA[c] /= n; pB[c] /= n; });
  const po = percentAgreement(a, b);
  const pe = cats.reduce((s, c) => s + pA[c] * pB[c], 0);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

/**
 * Weighted kappa for ORDINAL scores — partial credit for being one tier off (e.g. rating
 * "satisfactory" when the other rater said "proficient" counts as near-agreement, not a full miss).
 * @param {Array} a  first rater's scores (labels or numbers)
 * @param {Array} b  second rater's scores, same length as `a`
 * @param {{ weights?: 'linear'|'quadratic', categories?: Array }} [opts]  weighting scheme and
 *   optional explicit ordered category list (defaults to the sorted categories observed in the data)
 * @returns {number} weighted kappa in [-1, 1]
 */
export function weightedKappa(a, b, opts = {}) {
  assertPair(a, b);
  const kind = opts.weights || 'linear';
  const cats = opts.categories || categoriesOf(a, b);
  const idx = new Map(cats.map((c, i) => [c, i]));
  const k = cats.length;
  const n = a.length;
  if (k < 2) return 1;
  const w = (i, j) => { const d = Math.abs(i - j) / (k - 1); return 1 - (kind === 'quadratic' ? d * d : d); };
  const O = Array.from({ length: k }, () => new Array(k).fill(0));
  const rA = new Array(k).fill(0), rB = new Array(k).fill(0);
  for (let m = 0; m < n; m++) {
    const i = idx.get(a[m]), j = idx.get(b[m]);
    if (i === undefined || j === undefined) throw new Error(`score not in categories: ${i === undefined ? a[m] : b[m]}`);
    O[i][j]++; rA[i]++; rB[j]++;
  }
  let po = 0, pe = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { po += w(i, j) * (O[i][j] / n); pe += w(i, j) * ((rA[i] / n) * (rB[j] / n)); }
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

/**
 * Fleiss' kappa for a PANEL of raters. Corrects agreement for chance across the whole panel.
 * @param {Array<Array>} ratings  one row per item; each row lists the category each rater assigned.
 *   Every row must have the same number of raters (>= 2).
 * @returns {number} kappa in [-1, 1]
 */
export function fleissKappa(ratings) {
  if (!Array.isArray(ratings) || !ratings.length) throw new Error('need at least one item');
  const nRaters = ratings[0].length;
  if (nRaters < 2) throw new Error('need at least 2 raters per item');
  if (ratings.some((row) => !Array.isArray(row) || row.length !== nRaters)) throw new Error('every item must have the same number of raters');
  const cats = categoriesOf(...ratings);
  const N = ratings.length;
  const counts = ratings.map((row) => { const c = {}; cats.forEach((k) => (c[k] = 0)); row.forEach((v) => c[v]++); return c; });
  const Pi = counts.map((c) => (cats.reduce((s, k) => s + c[k] * c[k], 0) - nRaters) / (nRaters * (nRaters - 1)));
  const Pbar = Pi.reduce((s, v) => s + v, 0) / N;
  const pj = cats.map((k) => counts.reduce((s, c) => s + c[k], 0) / (N * nRaters));
  const Pe = pj.reduce((s, p) => s + p * p, 0);
  return Pe === 1 ? 1 : (Pbar - Pe) / (1 - Pe);
}

/**
 * Landis & Koch interpretation label for a kappa value.
 * @param {number} k  a kappa value in [-1, 1]
 * @returns {'poor'|'slight'|'fair'|'moderate'|'substantial'|'almost perfect'}
 */
export function interpretKappa(k) {
  if (k < 0) return 'poor';
  if (k <= 0.20) return 'slight';
  if (k <= 0.40) return 'fair';
  if (k <= 0.60) return 'moderate';
  if (k <= 0.80) return 'substantial';
  return 'almost perfect';
}

/**
 * One-call summary from two raters' columns: observed agreement, Cohen's kappa, weighted kappa,
 * and the Landis & Koch interpretation of the (unweighted) kappa.
 * @param {Array} a  first rater's scores (labels or numbers)
 * @param {Array} b  second rater's scores, same length as `a`
 * @param {{ weights?: 'linear'|'quadratic', categories?: Array }} [opts]  passed to `weightedKappa`
 * @returns {{ n: number, percentAgreement: number, cohenKappa: number, weightedKappa: number, interpretation: string }}
 */
export function reliabilityReport(a, b, opts = {}) {
  const kappa = cohenKappa(a, b);
  const wk = weightedKappa(a, b, opts);
  return {
    n: a.length,
    percentAgreement: round(percentAgreement(a, b)),
    cohenKappa: round(kappa),
    weightedKappa: round(wk),
    interpretation: interpretKappa(kappa),
  };
}
const round = (x) => Math.round(x * 1000) / 1000;
