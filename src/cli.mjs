#!/usr/bin/env node
// rubricon <task.json>   — prints a BARS rubric (or a flag) as JSON
import { readFileSync } from 'node:fs';
import { generateRubric } from './rubric.js';
const input = process.argv[2];
if (!input) { console.error('usage: rubricon <task.json>'); process.exit(1); }
const task = JSON.parse(readFileSync(input, 'utf8'));
const r = await generateRubric(task);
console.log(JSON.stringify(r, null, 2));
