import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTraceability, validateRubric } from '../src/verify.js';

const source = 'Construct primary fighting positions. Camouflage and conceal the position. Maintain observation to the front, flank, and rear.';

test('grounded anchor (verbatim source) verifies', () => {
  const rubric = { dimensions: [{ name: 'Camouflage', source: 'Camouflage and conceal the position', anchors: { unsatisfactory: 'a', satisfactory: 'b', proficient: 'c' } }] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.grounded, true);
  assert.equal(v.dimensions[0].method, 'substring');
});

test('fabricated source phrase is caught as ungrounded', () => {
  const rubric = { dimensions: [{ name: 'Fake', source: 'engage the enemy with indirect fire at 500 meters', anchors: { unsatisfactory: 'a', satisfactory: 'b', proficient: 'c' } }] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.grounded, false);
  assert.equal(v.ungrounded.length, 1);
});

test('validateRubric flags a missing tier and indistinct tiers', () => {
  const bad = { dimensions: [{ name: 'X', source: 's', anchors: { unsatisfactory: 'same', satisfactory: 'same', proficient: '' } }] };
  const r = validateRubric(bad);
  assert.equal(r.valid, false);
  assert.ok(r.issues.length >= 2);
});
