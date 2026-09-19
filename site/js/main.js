// Browser entry point: load the question bank, validate it, mount the quiz.
// The data URL is resolved relative to this module's own URL, so it is correct
// wherever the site is hosted (e.g. under the /Test/ subpath on GitHub Pages).

import { mountQuiz } from './app.js';
import { validateQuestions } from './validate.js';
import { ROUND_SIZE } from './quiz.js';

const DATA_URL = new URL('../data/questions.json', import.meta.url);

async function loadBank() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Could not load the question bank (HTTP ${response.status}).`);
  }
  const bank = await response.json();
  const problems = validateQuestions(bank);
  if (problems.length > 0) {
    throw new Error(`The question bank is invalid: ${problems[0].message}`);
  }
  if (bank.length < ROUND_SIZE) {
    throw new Error(`The question bank has ${bank.length} questions; a round needs ${ROUND_SIZE}.`);
  }
  return bank;
}

try {
  mountQuiz(document, await loadBank());
} catch (error) {
  console.error(error);
  const box = document.getElementById('load-error');
  box.textContent = `Sorry, the quiz could not start. ${error.message}`;
  box.hidden = false;
}
