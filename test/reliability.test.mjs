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

test('bad input is rejected with clear errors', () => {
  assert.throws(() => cohenKappa([1, 2], [1]), /equal, non-empty/);
  assert.throws(() => percentAgreement('a', 'b'), /must be arrays/);
  assert.throws(() => weightedKappa(['x'], ['x'], { categories: ['a', 'b'] }), /not in categories/);
  assert.throws(() => fleissKappa([['y', 'y'], ['n']]), /same number of raters/);
  assert.throws(() => fleissKappa([['y'], ['n']]), /at least 2 raters/);
});
