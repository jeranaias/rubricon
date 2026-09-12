import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTraceability, validateRubric } from '../src/verify.js';

const source = 'Verify the caller\'s identity using two approved identifiers. Acknowledge the reported problem and restate it to confirm understanding. Confirm the agreed next steps before ending the call.';

test('grounded anchor (verbatim source) verifies', () => {
  const rubric = { dimensions: [{ name: 'Acknowledgement', source: 'Acknowledge the reported problem and restate it', anchors: { unsatisfactory: 'a', satisfactory: 'b', proficient: 'c' } }] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.grounded, true);
  assert.equal(v.dimensions[0].method, 'substring');
});

test('fabricated source phrase is caught as ungrounded', () => {
  const rubric = { dimensions: [{ name: 'Fake', source: 'offer a replacement device shipped within 24 hours', anchors: { unsatisfactory: 'a', satisfactory: 'b', proficient: 'c' } }] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.grounded, false);
  assert.equal(v.ungrounded.length, 1);
});

test('near-verbatim source verifies via token overlap, not substring', () => {
  // phrase drops the articles, so it is not a substring but shares nearly all content tokens
  const rubric = { dimensions: [{ name: 'Closure', source: 'confirm agreed next steps before ending call', anchors: { unsatisfactory: 'a', satisfactory: 'b', proficient: 'c' } }] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.grounded, true);
  assert.equal(v.dimensions[0].method, 'overlap');
  assert.ok(v.dimensions[0].score >= 0.6);
});

test('coverage is reported across mixed grounded/ungrounded dimensions', () => {
  const rubric = { dimensions: [
    { name: 'Real', source: 'Acknowledge the reported problem', anchors: {} },
    { name: 'Fake', source: 'issue a full cash refund immediately', anchors: {} },
  ] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.coverage, 0.5);
  assert.equal(v.grounded, false);
});

test('grounding works for non-ASCII (Unicode) standards', () => {
  // Old ASCII-only norm stripped the accents/script, so the substring never matched.
  const fr = 'Vérifier l\'identité du client avant de poursuivre la démarche.';
  const rubric = { dimensions: [{ name: 'Identité', source: 'Vérifier l\'identité du client', anchors: {} }] };
  const v = verifyTraceability(rubric, fr);
  assert.equal(v.grounded, true);
  assert.equal(v.dimensions[0].method, 'substring');

  const ar = 'يجب على المتدرب التحقق من هوية العميل قبل المتابعة.';
  const arRubric = { dimensions: [{ name: 'هوية', source: 'التحقق من هوية العميل', anchors: {} }] };
  assert.equal(verifyTraceability(arRubric, ar).grounded, true);
});

test('a one-word source phrase grounds nothing, even as a substring', () => {
  // "identity" appears verbatim in the source, but a lone token is too generic to confirm.
  const rubric = { dimensions: [{ name: 'Weak', source: 'identity', anchors: {} }] };
  const v = verifyTraceability(rubric, source);
  assert.equal(v.grounded, false);
  assert.equal(v.dimensions[0].method, 'none');
});

test('validateRubric flags indistinct end tiers (unsatisfactory === proficient)', () => {
  // Middle tier differs, so an adjacent-only check would miss that the two ends are identical.
  const bad = { dimensions: [{ name: 'Ends', source: 's', anchors: { unsatisfactory: 'did the thing', satisfactory: 'did it well', proficient: 'did the thing' } }] };
  const r = validateRubric(bad);
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((m) => /indistinct tiers/.test(m)));
});

test('validateRubric flags a missing tier and indistinct tiers', () => {
  const bad = { dimensions: [{ name: 'X', source: 's', anchors: { unsatisfactory: 'same', satisfactory: 'same', proficient: '' } }] };
  const r = validateRubric(bad);
  assert.equal(r.valid, false);
  assert.ok(r.issues.length >= 2);
});
