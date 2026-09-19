// R7 / AC7 (first answer locks), R8 (exact feedback copy), R9 (flow), and scoring.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuizSession, feedbackText, ROUND_SIZE } from '../site/js/quiz.js';
import { seededRandom, loadSeedBank } from './helpers.mjs';

const newSession = (seed = 1) => new QuizSession(loadSeedBank(), { random: seededRandom(seed) });
const correctIndex = (s) => s.choices.indexOf(s.question.correctAnswer);
const wrongIndex = (s) => (correctIndex(s) + 1) % 4;

/** Play a whole round choosing per question via `pick(session)`. */
function playRound(session, pick) {
  while (!session.isFinished) {
    session.answer(pick(session));
    session.next();
  }
}

// --- first answer locks -----------------------------------------------------

test('a second answer to the same question changes neither the outcome nor the score', () => {
  const s = newSession();
  const first = s.answer(wrongIndex(s));
  assert.equal(first.correct, false);
  assert.equal(s.score, 0);

  assert.equal(s.answer(correctIndex(s)), null, 'switching to the right answer must be ignored');
  assert.equal(s.score, 0);
});

test('repeated identical answers (double-click) add to the score once', () => {
  const s = newSession();
  const idx = correctIndex(s);
  const results = [s.answer(idx), s.answer(idx), s.answer(idx), s.answer(idx)];
  assert.equal(results[0].correct, true);
  assert.deepEqual(results.slice(1), [null, null, null]);
  assert.equal(s.score, 1);
});

test('a burst of different choices in the same tick counts only the first', () => {
  const s = newSession();
  const idx = correctIndex(s);
  const burst = [0, 1, 2, 3].map((i) => s.answer(i));
  assert.equal(burst.filter((r) => r !== null).length, 1);
  assert.equal(burst[0].selectedIndex, 0);
  assert.equal(s.score, idx === 0 ? 1 : 0);
});

test('the lock resets for the next question', () => {
  const s = newSession();
  s.answer(correctIndex(s));
  s.next();
  const second = s.answer(correctIndex(s));
  assert.equal(second.correct, true);
  assert.equal(s.score, 2);
});

test('an out-of-range choice throws and does not lock the question', () => {
  const s = newSession();
  for (const bad of [-1, 4, 1.5, NaN, '0', undefined]) {
    assert.throws(() => s.answer(bad), RangeError);
  }
  assert.equal(s.isAnswered, false);
  assert.equal(s.answer(correctIndex(s)).correct, true);
});

// --- flow -------------------------------------------------------------------

test('cannot advance before answering', () => {
  const s = newSession();
  assert.throws(() => s.next(), /before the current question has been answered/);
  assert.equal(s.number, 1);
});

test('progress runs 1..10 and the round finishes after the tenth Next', () => {
  const s = newSession();
  const seen = [];
  while (!s.isFinished) {
    seen.push(s.number);
    assert.equal(s.total, ROUND_SIZE);
    s.answer(0);
    s.next();
  }
  assert.deepEqual(seen, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.throws(() => s.answer(0), /finished/);
  assert.throws(() => s.next(), /finished/);
  assert.throws(() => s.choices, /finished/);
});

test('a new session is a fresh round with the score reset (Play again)', () => {
  const bank = loadSeedBank();
  const first = new QuizSession(bank, { random: seededRandom(1) });
  playRound(first, correctIndex);
  assert.equal(first.score, 10);

  const second = new QuizSession(bank, { random: seededRandom(2) });
  assert.equal(second.score, 0);
  assert.equal(second.number, 1);
  assert.equal(second.isFinished, false);
});

// --- scoring ----------------------------------------------------------------

test('scoring: all right is 10, all wrong is 0', () => {
  const allRight = newSession(3);
  playRound(allRight, correctIndex);
  assert.equal(allRight.score, 10);

  const allWrong = newSession(3);
  playRound(allWrong, wrongIndex);
  assert.equal(allWrong.score, 0);
});

test('scoring: a mixed round counts exactly the correct first answers', () => {
  const s = newSession(4);
  let expected = 0;
  let n = 0;
  playRound(s, (session) => {
    n += 1;
    const right = n % 3 === 0; // right on questions 3, 6, 9
    if (right) expected += 1;
    return right ? correctIndex(session) : wrongIndex(session);
  });
  assert.equal(expected, 3);
  assert.equal(s.score, expected);
});

test('scoring ignores switched answers: wrong first, then right, is still wrong', () => {
  const s = newSession(5);
  while (!s.isFinished) {
    assert.equal(s.answer(wrongIndex(s)).correct, false);
    assert.equal(s.answer(correctIndex(s)), null); // dropped by the lock
    s.next();
  }
  assert.equal(s.score, 0);
});

// --- feedback copy (R8) -----------------------------------------------------

test('correct feedback is "Correct!" then the fact, exactly', () => {
  const s = newSession();
  const result = s.answer(correctIndex(s));
  assert.equal(feedbackText(result), `Correct! ${s.question.fact}`);
});

test('incorrect feedback is "Incorrect — the answer is X." then the fact, exactly', () => {
  const s = newSession();
  const q = s.question;
  const result = s.answer(wrongIndex(s));
  const text = feedbackText(result);
  assert.equal(text, `Incorrect — the answer is ${q.correctAnswer}. ${q.fact}`);
  assert.ok(text.includes('—'), 'must contain an em dash');
});

test('the result identifies both the student\'s pick and the correct choice for marking', () => {
  const s = newSession();
  const wrong = wrongIndex(s);
  const right = correctIndex(s);
  const result = s.answer(wrong);
  assert.equal(result.selectedIndex, wrong);
  assert.equal(result.correctIndex, right);
  assert.equal(result.correctAnswer, s.question.correctAnswer);
});
