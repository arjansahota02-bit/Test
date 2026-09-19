// Question-bank validation (sprint 1, R3). Pure functions, shared by the
// automated check (tools/validate-questions.mjs), the tests, and the app,
// which refuses to start a round on data that fails it.

import { CATEGORIES } from './quiz.js';

export const QUESTION_FIELDS = Object.freeze([
  'id',
  'category',
  'question',
  'correctAnswer',
  'distractors',
  'fact',
  'source',
]);

const STRING_FIELDS = ['id', 'category', 'question', 'correctAnswer', 'fact', 'source'];
const DISTRACTOR_COUNT = 3;

/** Comparison form used for every "same answer" check: case and edge whitespace ignored. */
export function normalize(text) {
  return text.trim().toLowerCase();
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * Validate a parsed question bank. Returns a list of problems, empty when the
 * bank is valid. Every problem names the offending entry by `id` (or by
 * position when the entry has no usable id) inside `message`.
 *
 * @returns {{ id: string | null, index: number | null, message: string }[]}
 */
export function validateQuestions(data) {
  if (!Array.isArray(data)) {
    return [{ id: null, index: null, message: 'Question data must be a JSON array of entries.' }];
  }

  const problems = [];
  const firstIndexOfId = new Map();

  data.forEach((entry, index) => {
    const hasId = isNonEmptyString(entry?.id);
    const label = hasId ? `Question "${entry.id}"` : `Entry #${index + 1}`;
    const report = (detail) =>
      problems.push({ id: hasId ? entry.id : null, index, message: `${label}: ${detail}` });

    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      report('must be an object.');
      return;
    }

    if (hasId) {
      // Same comparison rule as every other R3 check: case and edge whitespace ignored.
      const key = normalize(entry.id);
      if (firstIndexOfId.has(key)) {
        report(
          `duplicate id (same as entry #${firstIndexOfId.get(key) + 1}, ignoring case and surrounding whitespace).`,
        );
      } else {
        firstIndexOfId.set(key, index);
      }
    }

    const missing = QUESTION_FIELDS.filter((f) => !(f in entry));
    if (missing.length > 0) report(`missing field(s): ${missing.join(', ')}.`);
    const extra = Object.keys(entry).filter((f) => !QUESTION_FIELDS.includes(f));
    if (extra.length > 0) report(`unexpected field(s): ${extra.join(', ')}.`);

    for (const field of STRING_FIELDS) {
      if (field in entry && !isNonEmptyString(entry[field])) {
        report(`"${field}" must be a non-empty string.`);
      }
    }

    if (isNonEmptyString(entry.category) && !CATEGORIES.includes(entry.category)) {
      report(`category "${entry.category}" is not one of: ${CATEGORIES.join(', ')}.`);
    }

    if (isNonEmptyString(entry.fact) && /[\r\n]/.test(entry.fact)) {
      report('"fact" must be a single line.');
    }

    if ('distractors' in entry) {
      const d = entry.distractors;
      if (!Array.isArray(d) || d.length !== DISTRACTOR_COUNT) {
        report(`"distractors" must be an array of exactly ${DISTRACTOR_COUNT} strings.`);
      } else if (!d.every(isNonEmptyString)) {
        report('"distractors" must contain only non-empty strings.');
      } else if (isNonEmptyString(entry.correctAnswer)) {
        const correct = normalize(entry.correctAnswer);
        d.filter((x) => normalize(x) === correct).forEach((x) =>
          report(`distractor "${x}" is the same as correctAnswer.`),
        );
        const seen = new Set();
        for (const x of d) {
          const key = normalize(x);
          if (key === correct) continue; // already reported above
          if (seen.has(key)) report(`duplicate choice "${x}" among the distractors.`);
          seen.add(key);
        }
      }
    }
  });

  return problems;
}
