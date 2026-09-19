// R4 / AC4: mechanical checks on the seed bank.
//
// These automate only the rules a machine can check. They say nothing about
// whether the history is right — that is the product owner's review (R14).
//
// Sprint 2 replaces the seed bank with the full ~100-question bank, so the
// two size assertions below ("exactly 12", "3 per category") are seed-specific
// and are expected to be updated then. Everything else here should keep holding.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../site/js/quiz.js';
import { loadSeedBank } from './helpers.mjs';

const bank = loadSeedBank();
const textOf = (q) => [q.question, q.correctAnswer, ...q.distractors, q.fact].join(' \n ');

test('seed bank has exactly 12 questions', () => {
  assert.equal(bank.length, 12);
});

test('seed bank has exactly 3 questions in each of the four categories', () => {
  for (const category of CATEGORIES) {
    assert.equal(bank.filter((q) => q.category === category).length, 3, category);
  }
});

test('no question is phrased relative to the "current" or "most recent" president', () => {
  const stale = /\b(current|present|sitting|incumbent|most recent|latest|newest)\b[^.?]*\bpresident/i;
  for (const q of bank) {
    assert.doesNotMatch(textOf(q), stale, `${q.id} looks time-sensitive`);
  }
});

test('every source is a real citation, not a placeholder', () => {
  for (const q of bank) {
    assert.ok(q.source.length >= 15, `${q.id} source is too short to be a citation`);
    assert.doesNotMatch(q.source, /todo|tbd|placeholder|n\/a/i, `${q.id} has a placeholder source`);
  }
});

test('Cleveland numbering, wherever it appears, is 22nd and 24th (never a single number)', () => {
  for (const q of bank.filter((x) => /cleveland/i.test(textOf(x)))) {
    assert.match(textOf(q), /22nd and 24th/, `${q.id} mentions Cleveland without the 22nd/24th pair`);
  }
});

test('Trump numbering, if it ever appears, is 45th and 47th', () => {
  for (const q of bank.filter((x) => /trump/i.test(textOf(x)))) {
    assert.match(textOf(q), /45th and 47th/, `${q.id} mentions Trump without the 45th/47th pair`);
  }
});
