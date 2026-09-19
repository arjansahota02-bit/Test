// DOM layer. Holds no quiz rules: every decision (what counts, what is
// locked, what the feedback says) comes from QuizSession. This file only
// renders the session's state and forwards clicks to it.

import { QuizSession, feedbackText } from './quiz.js';

const CHOICE_TAGS = {
  correctPicked: '✓ Your answer — correct',
  wrongPicked: '✗ Your answer — incorrect',
  correctRevealed: '✓ Correct answer',
};

function byId(root, id) {
  const el = root.querySelector(`#${id}`);
  if (!el) throw new Error(`Missing required element #${id} in the page.`);
  return el;
}

/**
 * Wire the quiz to the page.
 * @param root the element (or document) containing the three screens
 * @param bank validated question data
 * @param options.random injectable randomness, for deterministic checks
 */
export function mountQuiz(root, bank, { random = Math.random } = {}) {
  const doc = root.ownerDocument ?? root;
  const screens = {
    start: byId(root, 'screen-start'),
    question: byId(root, 'screen-question'),
    results: byId(root, 'screen-results'),
  };
  const startBtn = byId(root, 'start-btn');
  const againBtn = byId(root, 'again-btn');
  const nextBtn = byId(root, 'next-btn');
  const progress = byId(root, 'progress');
  const questionText = byId(root, 'question-text');
  const questionHeading = byId(root, 'question-heading');
  const choicesBox = byId(root, 'choices');
  const feedback = byId(root, 'feedback');
  const feedbackIcon = byId(root, 'feedback-icon');
  const feedbackMessage = byId(root, 'feedback-text');
  const resultsHeading = byId(root, 'results-heading');
  const score = byId(root, 'score');

  /** @type {QuizSession | null} */
  let session = null;

  function show(name) {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  }

  function startRound() {
    session = new QuizSession(bank, { random });
    renderQuestion();
  }

  function renderQuestion() {
    show('question');
    progress.textContent = `Question ${session.number} of ${session.total}`;
    questionText.textContent = session.question.question;

    choicesBox.replaceChildren();
    session.choices.forEach((text, index) => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn choice';
      btn.dataset.index = String(index);
      const label = doc.createElement('span');
      label.className = 'choice-text';
      label.textContent = text;
      btn.append(label);
      choicesBox.append(btn);
    });

    feedback.hidden = true;
    feedbackMessage.textContent = '';
    nextBtn.hidden = true;
    questionHeading.focus();
  }

  function onChoiceClick(event) {
    const btn = event.target.closest('button.choice');
    if (!btn || !session || btn.disabled) return;

    // Lock the whole group before anything else, so no second event in the same
    // tick can reach a live button; QuizSession.answer() is the real lock.
    const buttons = [...choicesBox.querySelectorAll('button.choice')];
    buttons.forEach((b) => {
      b.disabled = true;
    });

    const result = session.answer(Number(btn.dataset.index));
    if (result === null) return; // already answered: nothing to change

    buttons.forEach((b, i) => {
      const tag = tagFor(i, result);
      if (!tag) return;
      b.classList.add(i === result.correctIndex ? 'choice-correct' : 'choice-wrong');
      const tagEl = doc.createElement('span');
      tagEl.className = 'choice-tag';
      tagEl.textContent = tag;
      b.append(tagEl);
    });

    feedback.classList.toggle('feedback-correct', result.correct);
    feedback.classList.toggle('feedback-wrong', !result.correct);
    feedbackIcon.textContent = result.correct ? '✓' : '✗';
    feedbackMessage.textContent = feedbackText(result);
    feedback.hidden = false;

    nextBtn.hidden = false;
    nextBtn.focus();
  }

  function tagFor(i, result) {
    if (i === result.selectedIndex) {
      return result.correct ? CHOICE_TAGS.correctPicked : CHOICE_TAGS.wrongPicked;
    }
    return i === result.correctIndex ? CHOICE_TAGS.correctRevealed : null;
  }

  function onNext() {
    if (!session || !session.isAnswered) return;
    session.next();
    if (session.isFinished) {
      renderResults();
    } else {
      renderQuestion();
    }
  }

  function renderResults() {
    show('results');
    score.textContent = `${session.score} / ${session.total}`;
    resultsHeading.focus();
  }

  choicesBox.addEventListener('click', onChoiceClick);
  nextBtn.addEventListener('click', onNext);
  // Focus lands on Next right after an answer; a still-held Enter key would
  // otherwise auto-repeat straight through it and skip the next question.
  nextBtn.addEventListener('keydown', (event) => {
    if (event.repeat) event.preventDefault();
  });
  startBtn.addEventListener('click', startRound);
  againBtn.addEventListener('click', startRound);

  startBtn.disabled = false;
}
