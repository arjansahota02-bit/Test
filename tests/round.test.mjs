// R5 / AC5 (round draw) and R6 / AC6 (choice shuffling).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, ROUND_SIZE, drawRound, shuffle, QuizSession } from '../site/js/quiz.js';
import { seededRandom, makeSkewedBank, loadSeedBank } from './helpers.mjs';

const distinctCategories = (round) => new Set(round.map((q) => q.category)).size;

test('a round is exactly 10 distinct questions', () => {
  const bank = loadSeedBank();
  for (let seed = 1; seed <= 200; seed++) {
    const round = drawRound(bank, { random: seededRandom(seed) });
    assert.equal(round.length, ROUND_SIZE);
    assert.equal(new Set(round.map((q) => q.id)).size, ROUND_SIZE, `repeat in seed ${seed}`);
  }
});

test('the skewed test bank really would fail a naive draw (the test is meaningful)', () => {
  const bank = makeSkewedBank();
  let naiveFailures = 0;
  const trials = 1000;
  for (let seed = 1; seed <= trials; seed++) {
    const naive = shuffle(bank, seededRandom(seed)).slice(0, ROUND_SIZE);
    if (distinctCategories(naive) < 3) naiveFailures++;
  }
  assert.ok(naiveFailures / trials > 0.1, `naive draw only failed ${naiveFailures}/${trials}`);
});

test('drawing from a skewed bank still yields 10 distinct questions across >= 3 categories', () => {
  const bank = makeSkewedBank();
  for (let seed = 1; seed <= 2000; seed++) {
    const round = drawRound(bank, { random: seededRandom(seed) });
    assert.equal(round.length, ROUND_SIZE);
    assert.equal(new Set(round.map((q) => q.id)).size, ROUND_SIZE, `repeat in seed ${seed}`);
    assert.ok(distinctCategories(round) >= 3, `only ${distinctCategories(round)} categories in seed ${seed}`);
  }
});

test('the category rule holds even for the harshest feasible bank (1 + 1 + 1 + 40)', () => {
  const bank = makeSkewedBank({ big: 40, small: 1 });
  for (let seed = 1; seed <= 500; seed++) {
    assert.ok(distinctCategories(drawRound(bank, { random: seededRandom(seed) })) >= 3);
  }
});

test('a draw that already satisfies the rule is not altered by the repair step', () => {
  // With a balanced bank the repair never triggers, so drawRound must equal a
  // plain shuffle-and-take followed by the final reshuffle.
  const bank = loadSeedBank();
  const seed = 7;
  const r = seededRandom(seed);
  const shuffled = shuffle(bank, r);
  const expected = shuffle(shuffled.slice(0, ROUND_SIZE), r);
  assert.deepEqual(drawRound(bank, { random: seededRandom(seed) }), expected);
});

test('the same seed gives the same round; different seeds differ', () => {
  const bank = loadSeedBank();
  const ids = (seed) => drawRound(bank, { random: seededRandom(seed) }).map((q) => q.id).join();
  assert.equal(ids(3), ids(3));
  const distinctRounds = new Set(Array.from({ length: 20 }, (_, i) => ids(i + 1)));
  assert.ok(distinctRounds.size > 10);
});

test('handles degenerate random sources (always 0, and always ~1)', () => {
  const bank = makeSkewedBank();
  for (const random of [() => 0, () => 0.9999999999]) {
    const round = drawRound(bank, { random });
    assert.equal(new Set(round.map((q) => q.id)).size, ROUND_SIZE);
    assert.ok(distinctCategories(round) >= 3);
  }
  assert.equal(shuffle([1, 2, 3], () => 1).length, 3); // exactly 1 must not index out of range
});

test('refuses to draw when the bank cannot satisfy a round', () => {
  assert.throws(() => drawRound(makeSkewedBank({ big: 5, small: 1 }).slice(0, 9)), /needs 10/);
  const twoCategories = makeSkewedBank({ big: 10, small: 0 }).filter((q) => q.category === CATEGORIES[0]);
  assert.throws(() => drawRound(twoCategories), /covers 1 categories/);
});

test('shuffle does not modify its input and keeps every element', () => {
  const input = [1, 2, 3, 4, 5, 6];
  const out = shuffle(input, seededRandom(5));
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...out].sort(), input);
});

test('over many shuffles the correct answer lands in all four positions, roughly evenly', () => {
  const bank = loadSeedBank();
  const positions = [0, 0, 0, 0];
  const rounds = 500;
  for (let seed = 1; seed <= rounds; seed++) {
    const session = new QuizSession(bank, { random: seededRandom(seed) });
    while (!session.isFinished) {
      positions[session.choices.indexOf(session.question.correctAnswer)]++;
      session.answer(0);
      session.next();
    }
  }
  const total = positions.reduce((a, b) => a + b, 0);
  assert.equal(total, rounds * ROUND_SIZE);
  positions.forEach((count, slot) => {
    assert.ok(count > 0, `correct answer never landed in slot ${slot}`);
    const share = count / total;
    assert.ok(share > 0.2 && share < 0.3, `slot ${slot} share ${share.toFixed(3)} is not ~0.25`);
  });
});

test('the same question shows its choices in different orders on different showings', () => {
  const bank = loadSeedBank();
  const ordersByQuestion = new Map();
  for (let seed = 1; seed <= 30; seed++) {
    const session = new QuizSession(bank, { random: seededRandom(seed) });
    while (!session.isFinished) {
      const orders = ordersByQuestion.get(session.question.id) ?? new Set();
      orders.add(JSON.stringify(session.choices));
      ordersByQuestion.set(session.question.id, orders);
      session.answer(0);
      session.next();
    }
  }
  for (const [id, orders] of ordersByQuestion) {
    assert.ok(orders.size > 1, `question ${id} was always shown with the same choice order`);
  }
});

test('every shown set of choices is the correct answer plus the three distractors', () => {
  const bank = loadSeedBank();
  const session = new QuizSession(bank, { random: seededRandom(11) });
  const q = session.question;
  assert.deepEqual([...session.choices].sort(), [q.correctAnswer, ...q.distractors].sort());
});
