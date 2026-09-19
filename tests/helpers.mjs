// Shared test helpers. Randomness in the engine is injectable, so tests use a
// small seeded PRNG (mulberry32) and stay fully deterministic.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../site/js/quiz.js';

export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED_BANK_PATH = fileURLToPath(new URL('../site/data/questions.json', import.meta.url));

export function loadSeedBank() {
  return JSON.parse(readFileSync(SEED_BANK_PATH, 'utf8'));
}

/** A valid question with overridable fields. */
export function makeQuestion(overrides = {}) {
  return {
    id: 'q-1',
    category: 'order-terms',
    question: 'Who was the 1st president?',
    correctAnswer: 'George Washington',
    distractors: ['John Adams', 'Thomas Jefferson', 'James Madison'],
    fact: 'Washington served from 1789 to 1797.',
    source: 'Test fixture',
    ...overrides,
  };
}

/**
 * A synthetic bank deliberately skewed so a naive random draw of 10 often
 * misses categories: `big` questions in the first category, `small` in each of
 * the other three.
 */
export function makeSkewedBank({ big = 30, small = 2 } = {}) {
  const bank = [];
  const counts = [big, small, small, small];
  CATEGORIES.forEach((category, c) => {
    for (let i = 0; i < counts[c]; i++) {
      bank.push(
        makeQuestion({
          id: `${category}-${i + 1}`,
          category,
          question: `Question ${category} ${i + 1}?`,
          correctAnswer: `Right ${category} ${i + 1}`,
          distractors: [`Wrong A ${category} ${i + 1}`, `Wrong B ${category} ${i + 1}`, `Wrong C ${category} ${i + 1}`],
        }),
      );
    }
  });
  return bank;
}
