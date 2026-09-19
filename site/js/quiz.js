// Quiz engine: pure logic, no DOM, no globals except an injectable `random`.
// Everything here is deterministic given a seeded `random`, which is how the
// tests in tests/ exercise it.

export const CATEGORIES = Object.freeze([
  'order-terms',
  'events-policies',
  'party-vp-bio',
  'quotes-trivia',
]);

export const ROUND_SIZE = 10;
export const MIN_CATEGORIES = 3;

/**
 * Fisher-Yates shuffle. Returns a new array; the input is not modified.
 * `random` must behave like Math.random (a float in [0, 1)); an injected
 * source that returns exactly 1 is clamped rather than indexing out of range.
 */
export function shuffle(items, random = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function countCategories(questions) {
  const counts = new Map();
  for (const q of questions) {
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  }
  return counts;
}

/**
 * Draw one round: `size` distinct questions covering at least `minCategories`
 * categories.
 *
 * The category rule is enforced here, not assumed of the bank. A uniform draw
 * is made first; if it happens to cover too few categories, questions from
 * the most over-represented categories are swapped for ones from categories
 * the round is missing. A draw that already satisfies the rule is left
 * exactly as drawn, so the repair does not distort ordinary rounds.
 */
export function drawRound(
  bank,
  { random = Math.random, size = ROUND_SIZE, minCategories = MIN_CATEGORIES } = {},
) {
  if (bank.length < size) {
    throw new Error(`Question bank has ${bank.length} questions but a round needs ${size}.`);
  }
  if (size < minCategories) {
    throw new Error(`A round of ${size} cannot cover ${minCategories} categories.`);
  }
  const bankCategories = countCategories(bank).size;
  if (bankCategories < minCategories) {
    throw new Error(
      `Question bank covers ${bankCategories} categories but a round needs ${minCategories}.`,
    );
  }

  const shuffled = shuffle(bank, random);
  const selected = shuffled.slice(0, size);
  const pool = shuffled.slice(size);
  const counts = countCategories(selected);

  while (counts.size < minCategories) {
    const incomingIdx = pool.findIndex((q) => !counts.has(q.category));
    let outgoingIdx = -1;
    for (let i = selected.length - 1; i >= 0; i--) {
      if (counts.get(selected[i].category) > 1) {
        outgoingIdx = i;
        break;
      }
    }
    // Both are guaranteed by the checks above (pigeonhole on `size` vs
    // `minCategories`, and the bank covering enough categories). Failing
    // loudly here means the invariant broke, not that the input was bad.
    if (incomingIdx === -1 || outgoingIdx === -1) {
      throw new Error('drawRound could not satisfy the category rule; this is a bug.');
    }
    const [incoming] = pool.splice(incomingIdx, 1);
    const [outgoing] = selected.splice(outgoingIdx, 1, incoming);
    counts.set(outgoing.category, counts.get(outgoing.category) - 1);
    counts.set(incoming.category, 1);
  }

  // Swapping leaves the round in an arbitrary order; reshuffle so position in
  // the round carries no information.
  return shuffle(selected, random);
}

/** Exact feedback copy (sprint 1, R8). */
export function feedbackText(result) {
  return result.correct
    ? `Correct! ${result.fact}`
    : `Incorrect — the answer is ${result.correctAnswer}. ${result.fact}`;
}

/**
 * One round of the quiz. The lock in `answer()` is the single source of truth
 * for "first answer counts": it records the selection *before* touching the
 * score, so a second call, however it arrives, sees the lock and returns.
 */
export class QuizSession {
  #questions;
  #random;
  #index = 0;
  #score = 0;
  #choices = null;
  #selectedIndex = null;

  constructor(bank, { random = Math.random, size = ROUND_SIZE } = {}) {
    this.#random = random;
    this.#questions = drawRound(bank, { random, size });
    this.#present();
  }

  get total() {
    return this.#questions.length;
  }

  /** 1-based position of the question on screen. */
  get number() {
    return Math.min(this.#index + 1, this.total);
  }

  get score() {
    return this.#score;
  }

  get isFinished() {
    return this.#index >= this.total;
  }

  get isAnswered() {
    return this.#selectedIndex !== null;
  }

  get question() {
    this.#assertActive();
    return this.#questions[this.#index];
  }

  /** The four choices as shown on screen, already shuffled. */
  get choices() {
    this.#assertActive();
    return this.#choices.slice();
  }

  /**
   * Record the student's pick. Returns the outcome for the first selection and
   * `null` for any later one on the same question, which changes nothing.
   */
  answer(choiceIndex) {
    this.#assertActive();
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= this.#choices.length) {
      throw new RangeError(`Choice index ${choiceIndex} is not one of 0..${this.#choices.length - 1}.`);
    }
    if (this.#selectedIndex !== null) return null;

    this.#selectedIndex = choiceIndex;
    const { correctAnswer, fact } = this.#questions[this.#index];
    const correctIndex = this.#choices.indexOf(correctAnswer);
    const correct = choiceIndex === correctIndex;
    if (correct) this.#score += 1;
    return { correct, selectedIndex: choiceIndex, correctIndex, correctAnswer, fact };
  }

  /** Move on after an answer. Advancing past the last question finishes the round. */
  next() {
    this.#assertActive();
    if (this.#selectedIndex === null) {
      throw new Error('Cannot advance before the current question has been answered.');
    }
    this.#index += 1;
    this.#present();
  }

  #present() {
    this.#selectedIndex = null;
    if (this.isFinished) {
      this.#choices = null;
      return;
    }
    const q = this.#questions[this.#index];
    this.#choices = shuffle([q.correctAnswer, ...q.distractors], this.#random);
  }

  #assertActive() {
    if (this.isFinished) throw new Error('The round is finished.');
  }
}
