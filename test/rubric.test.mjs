import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskToText } from '../src/rubric.js';

test('taskToText flattens a standard into labeled lines', () => {
  const text = taskToText({
    code: 'CS-CALL-01',
    title: 'Handle an Escalated Customer Call',
    standard: 'Verify identity, resolve within policy, confirm next steps.',
    steps: ['Verify the caller\'s identity.', 'Confirm the next steps.'],
  });
  assert.match(text, /Code: CS-CALL-01/);
  assert.match(text, /Title: Handle an Escalated Customer Call/);
  assert.match(text, /Standard: Verify identity/);
  assert.match(text, /1\. Verify the caller's identity\./);
  assert.match(text, /2\. Confirm the next steps\./);
});

test('taskToText accepts performanceSteps as an alias for steps', () => {
  const text = taskToText({ title: 'X', performanceSteps: ['Do the thing.'] });
  assert.match(text, /1\. Do the thing\./);
});

test('taskToText omits empty fields', () => {
  const text = taskToText({ title: 'Only a title' });
  assert.equal(text, 'Title: Only a title');
});

test('taskToText rejects non-object input', () => {
  assert.throws(() => taskToText(null), /must be an object/);
  assert.throws(() => taskToText('a string'), /must be an object/);
});
