#!/usr/bin/env node
// Automated question-bank check (sprint 1, R3).
//   node tools/validate-questions.mjs [path/to/questions.json]
// Prints one line per problem, each naming the offending question id, and
// exits 1 if there is any. Exits 0 (and says so) on a clean bank.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateQuestions } from '../site/js/validate.js';

const defaultPath = fileURLToPath(new URL('../site/data/questions.json', import.meta.url));
const path = process.argv[2] ?? defaultPath;

let data;
try {
  data = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  console.error(`Could not read question data from ${path}: ${error.message}`);
  process.exit(2);
}

const problems = validateQuestions(data);
if (problems.length > 0) {
  for (const problem of problems) console.error(problem.message);
  console.error(`\n${problems.length} problem(s) found in ${path}.`);
  process.exit(1);
}
console.log(`OK: ${data.length} question(s) in ${path} are valid.`);
