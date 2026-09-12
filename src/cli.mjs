#!/usr/bin/env node
// rubricon <task.json>   — generate a BARS rubric (or a flag) from a standard and print it as JSON.
import { readFileSync } from 'node:fs';
import { generateRubric } from './rubric.js';

const input = process.argv[2];
if (!input || input === '-h' || input === '--help') {
  const to = input ? process.stdout : process.stderr;
  to.write('usage: rubricon <task.json>\n\n' +
    'Reads a standard from a JSON file and prints a behaviorally-anchored rating scale.\n' +
    'Requires RUBRICON_API_KEY (or OPENROUTER_API_KEY). Optional: RUBRICON_ENDPOINT, RUBRICON_MODEL.\n');
  process.exit(input ? 0 : 1);
}

let task;
try {
  task = JSON.parse(readFileSync(input, 'utf8'));
} catch (e) {
  console.error(`could not read/parse ${input}: ${e.message}`);
  process.exit(1);
}

const r = await generateRubric(task);
console.log(JSON.stringify(r, null, 2));
if (r && r.error) process.exit(1);
