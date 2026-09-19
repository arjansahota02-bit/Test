// R3 / AC3: each violation is caught, and the message names the bad id.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQuestions } from '../site/js/validate.js';
import { makeQuestion, loadSeedBank, SEED_BANK_PATH } from './helpers.mjs';

const CLI = fileURLToPath(new URL('../tools/validate-questions.mjs', import.meta.url));

function assertNamesId(problems, id) {
  assert.ok(problems.length > 0, `expected a problem for "${id}", got none`);
  assert.ok(
    problems.some((p) => p.message.includes(`"${id}"`)),
    `no message names "${id}": ${JSON.stringify(problems.map((p) => p.message))}`,
  );
}

test('a well-formed bank has no problems', () => {
  assert.deepEqual(validateQuestions([makeQuestion(), makeQuestion({ id: 'q-2' })]), []);
});

test('the real seed bank passes', () => {
  assert.deepEqual(validateQuestions(loadSeedBank()), []);
});

test('non-array data is rejected', () => {
  assert.equal(validateQuestions({ questions: [] }).length, 1);
});

const invalidCases = [
  ['a missing field', () => { const q = makeQuestion({ id: 'bad-missing' }); delete q.fact; return [q]; }, /missing field\(s\): fact/],
  ['an unexpected extra field', () => [makeQuestion({ id: 'bad-extra', difficulty: 'hard' })], /unexpected field\(s\): difficulty/],
  ['an unknown category', () => [makeQuestion({ id: 'bad-cat', category: 'geography' })], /category "geography"/],
  ['a non-string question', () => [makeQuestion({ id: 'bad-type', question: 42 })], /"question" must be a non-empty string/],
  ['an empty source', () => [makeQuestion({ id: 'bad-source', source: '   ' })], /"source" must be a non-empty string/],
  ['a multi-line fact', () => [makeQuestion({ id: 'bad-fact', fact: 'line one\nline two' })], /single line/],
  ['too few distractors', () => [makeQuestion({ id: 'bad-two', distractors: ['A', 'B'] })], /exactly 3/],
  ['too many distractors', () => [makeQuestion({ id: 'bad-four', distractors: ['A', 'B', 'C', 'D'] })], /exactly 3/],
  ['distractors that are not an array', () => [makeQuestion({ id: 'bad-notarray', distractors: 'A, B, C' })], /exactly 3/],
  ['a non-string distractor', () => [makeQuestion({ id: 'bad-dtype', distractors: ['A', 7, 'C'] })], /only non-empty strings/],
  [
    'a distractor equal to the correct answer',
    () => [makeQuestion({ id: 'bad-same', distractors: ['George Washington', 'B', 'C'] })],
    /same as correctAnswer/,
  ],
  [
    'a distractor equal to the correct answer, ignoring case and whitespace',
    () => [makeQuestion({ id: 'bad-same-ci', distractors: ['  george WASHINGTON ', 'B', 'C'] })],
    /same as correctAnswer/,
  ],
  [
    'duplicate distractors',
    () => [makeQuestion({ id: 'bad-dupe-d', distractors: ['Adams', 'ADAMS ', 'C'] })],
    /duplicate choice/,
  ],
];

for (const [name, build, pattern] of invalidCases) {
  test(`flags ${name}, naming the id`, () => {
    const data = build();
    const problems = validateQuestions(data);
    assertNamesId(problems, data[0].id);
    assert.match(problems.map((p) => p.message).join('\n'), pattern);
  });
}

test('flags a duplicate id, naming it', () => {
  const problems = validateQuestions([makeQuestion({ id: 'dupe' }), makeQuestion({ id: 'dupe' })]);
  assertNamesId(problems, 'dupe');
  assert.match(problems[0].message, /duplicate id/);
});

test('only the offending entry is blamed', () => {
  const problems = validateQuestions([
    makeQuestion({ id: 'fine' }),
    makeQuestion({ id: 'broken', distractors: ['A', 'B'] }),
  ]);
  assert.ok(problems.every((p) => p.id === 'broken'));
});

test('an entry with no usable id is identified by position', () => {
  const problems = validateQuestions([makeQuestion(), makeQuestion({ id: '' })]);
  assert.equal(problems[0].id, null);
  assert.match(problems[0].message, /^Entry #2:/);
});

// The automated check is the CLI, so its output (not just its exit code) is asserted.
function runCli(data) {
  const dir = mkdtempSync(join(tmpdir(), 'quiz-validate-'));
  try {
    const file = join(dir, 'questions.json');
    writeFileSync(file, JSON.stringify(data));
    return spawnSync(process.execPath, [CLI, file], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('CLI: exits non-zero and prints the offending id for invalid data', () => {
  const result = runCli([makeQuestion({ id: 'ok-1' }), makeQuestion({ id: 'cli-bad', distractors: ['George Washington', 'B', 'C'] })]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /"cli-bad"/);
  assert.doesNotMatch(result.stderr, /"ok-1"/);
});

test('CLI: exits 0 on the real seed file', () => {
  const result = spawnSync(process.execPath, [CLI, SEED_BANK_PATH], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('CLI: exits 2 (not 0 or 1) when the file cannot be read', () => {
  const result = spawnSync(process.execPath, [CLI, join(tmpdir(), 'does-not-exist-quiz.json')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
});
