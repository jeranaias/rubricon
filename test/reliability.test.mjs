import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cohenKappa, weightedKappa, fleissKappa, percentAgreement, interpretKappa, reliabilityReport } from '../src/reliability.js';

test('perfect agreement → kappa 1', () => {
  const a = ['unsatisfactory', 'satisfactory', 'proficient', 'satisfactory'];
  assert.equal(cohenKappa(a, a), 1);
  assert.equal(percentAgreement(a, a), 1);
});

test("Cohen's kappa matches a hand-worked example", () => {
  // 2 raters, 2 categories: agree on 45+15=60, cross 10+5... classic table [[20,5],[10,15]]
  const a = [], b = [];
  const push = (n, x, y) => { for (let i = 0; i < n; i++) { a.push(x); b.push(y); } };
  push(20, 'y', 'y'); push(5, 'y', 'n'); push(10, 'n', 'y'); push(15, 'n', 'n');
  // po=0.7, pe = (25/50*30/50)+(25/50*20/50)=0.5 → kappa=0.4
  assert.ok(Math.abs(cohenKappa(a, b) - 0.4) < 1e-9);
});

test('weighted kappa gives partial credit for one-tier-off', () => {
  const cats = ['unsatisfactory', 'satisfactory', 'proficient'];
  const a = ['unsatisfactory', 'satisfactory', 'proficient'];
  const bClose = ['satisfactory', 'proficient', 'satisfactory']; // all one tier off
  const bFar = ['proficient', 'unsatisfactory', 'unsatisfactory']; // further off
  assert.ok(weightedKappa(a, bClose, { categories: cats }) > weightedKappa(a, bFar, { categories: cats }));
});

test("Fleiss' kappa runs for a 3-rater panel", () => {
  const ratings = [['y','y','y'],['n','n','n'],['y','y','n'],['n','n','n']];
  const k = fleissKappa(ratings);
  assert.ok(k >= -1 && k <= 1);
});

test('report + interpretation', () => {
  const r = reliabilityReport(['unsatisfactory','satisfactory'], ['unsatisfactory','satisfactory']);
  assert.equal(r.cohenKappa, 1);
  assert.equal(interpretKappa(1), 'almost perfect');
  assert.equal(interpretKappa(0.5), 'moderate');
  assert.equal(interpretKappa(-0.1), 'poor');
});

test('numeric scores work the same as tier labels', () => {
  assert.equal(cohenKappa([0, 1, 2, 1], [0, 1, 2, 1]), 1);
  assert.ok(weightedKappa([0, 1, 2], [1, 2, 1]) <= 1);
});

test('weighted kappa uses ordinal order, not alphabetical — exact low/medium/high', () => {
  // Hand computation (linear weights, k=3): pairs (low,low)x2, (medium,high), (high,medium).
  // po = (1+1 + 0.5 + 0.5)/4 = 0.75; marginals [2,1,1]/4 both raters → pe = 0.5625;
  // kappa = (0.75-0.5625)/(1-0.5625) = 0.1875/0.4375 = 3/7 = 0.428571…
  // Alphabetical ordering (the old bug) put high<low<medium and gave -0.333.
  const a = ['low', 'medium', 'low', 'high'];
  const b = ['low', 'high', 'low', 'medium'];
  assert.ok(Math.abs(weightedKappa(a, b, { categories: ['low', 'medium', 'high'] }) - 3 / 7) < 1e-9);
  // Unknown labels with no explicit order must refuse to guess (would have been alphabetical).
  assert.throws(() => weightedKappa(a, b), /ordinal order is undefined/);
});

test('weighted kappa orders canonical TIER labels ordinally, not alphabetically', () => {
  // Alphabetical order is proficient < satisfactory < unsatisfactory — the reverse of the scale.
  // One-tier-off must beat two-tiers-off; alphabetical mis-ranking would break this.
  const a = ['unsatisfactory', 'satisfactory', 'proficient'];
  const close = ['satisfactory', 'proficient', 'satisfactory'];
  const far = ['proficient', 'unsatisfactory', 'unsatisfactory'];
  assert.ok(weightedKappa(a, close) > weightedKappa(a, far));
});

test('category named __proto__ does not corrupt the tally', () => {
  // Plain {} counts would read the prototype for a "__proto__" key and produce NaN.
  assert.equal(cohenKappa(['__proto__', 'a'], ['__proto__', 'a']), 1);
  assert.equal(fleissKappa([['__proto__', '__proto__'], ['a', 'a']]), 1);
});

test('total disagreement → kappa exactly -1', () => {
  // 2 balanced categories, raters perfectly opposed: po=0, pe=0.5 → (0-0.5)/(1-0.5) = -1.
  assert.equal(cohenKappa(['y', 'n'], ['n', 'y']), -1);
});

test('interpretKappa guards non-finite input', () => {
  assert.equal(interpretKappa(NaN), 'undefined');
  assert.equal(interpretKappa(Infinity), 'undefined');
});

test('single-category (no-variance) input returns NaN, not a spurious 1', () => {
  assert.ok(Number.isNaN(cohenKappa(['x', 'x'], ['x', 'x'])));
  assert.ok(Number.isNaN(weightedKappa([1, 1], [1, 1])));
  assert.equal(interpretKappa(cohenKappa(['x', 'x'], ['x', 'x'])), 'undefined');
});

test('bad input is rejected with clear errors', () => {
  assert.throws(() => cohenKappa([1, 2], [1]), /equal, non-empty/);
  assert.throws(() => percentAgreement('a', 'b'), /must be arrays/);
  assert.throws(() => weightedKappa(['x'], ['x'], { categories: ['a', 'b'] }), /not in categories/);
  assert.throws(() => fleissKappa([['y', 'y'], ['n']]), /same number of raters/);
  assert.throws(() => fleissKappa([['y'], ['n']]), /at least 2 raters/);
});
