---
id: 1
title: "Quiz engine and UI with seed question bank"
epic: "US Presidents Quiz v1"
status: in_progress
created: 2026-09-19T19:01:31+00:00
---

# Master Controller Sprint Definition — Sprint 1

**Epic:** US Presidents Quiz v1: a static, no-login web quiz that teaches history students facts about US presidents through multiple-choice rounds with immediate feedback. Full spec: `docs/prd/us-presidents-quiz.md`.
**Sprint Objective:** Ship the complete quiz loop (start → 10 questions with feedback → score → play again), live on GitHub Pages, using a small seed bank of 12 questions approved by the product owner.

### Context
The PRD is approved. This sprint proves the whole product end to end on the real hosting target before we invest in writing ~100 questions. It also fixes the question data format that sprint 2 (the full bank) will fill. The format has to be stable when this sprint closes, because sprint 2 writes against it.

The product's worst possible defect is a wrong "correct answer." So even the 12 seed questions go through the product owner's factual review (R13). QA1 and LiveQA verify that the app shows the data correctly. They do not verify history, and nobody should read their passes as saying the facts are right.

### Requirements
1. **Static site on GitHub Pages under a subpath.** The app is a static site with no backend and no login. Its build output (or source, if there's no build step) works when served from `https://arjansahota02-bit.github.io/Test/`, i.e. under the `/Test/` subpath, not the domain root. Every script, style and data URL must resolve there. How it deploys (a Pages Actions workflow, or a branch/folder source) is Dev Team's choice, but it must be written down in `README.md` along with the exact GitHub Pages setting it needs. *Flagged assumption:* the `https://<user>.github.io/<repo>/` URL shape for a project Pages site is standard GitHub behaviour but hasn't been checked for this repo, because the repo isn't set up yet. The first real deploy confirms it (see LiveQA criteria).
2. **Question data file, separate from app code.** Questions live in one dedicated data file (e.g. `questions.json`). Each entry has: `id` (unique), `category` (exactly one of `order-terms`, `events-policies`, `party-vp-bio`, `quotes-trivia`), `question`, `correctAnswer`, `distractors` (exactly 3 strings), `fact` (one line) and `source` (a citation or URL). Sprint 2 fills in this format. Changing it later means another sprint.
3. **Data validation.** An automated check fails, naming the offending `id`, if any entry breaks R2, has a duplicate `id`, has a distractor equal to `correctAnswer`, or has duplicate choices among its four options. Comparisons ignore case and leading/trailing whitespace.
4. **Seed bank.** Exactly 12 questions, 3 per category, following the PRD §7 rules. None phrased relative to "the current/most recent president". Any numbering question respects Cleveland (22nd and 24th) and Trump (45th and 47th). Any quote must be confirmed by its cited source.
5. **Round draw.** A round is 10 questions drawn at random, with no repeats within a round and at least 3 of the 4 categories represented. The engine must enforce the category rule itself, not rely on the bank happening to be balanced. (With the seed bank, any 10 of 12 questions already covers all 4 categories, so the rule can only really be tested against a synthetic, deliberately skewed bank. See the acceptance criteria.)
6. **Choice shuffling.** The four choices are shuffled every time a question is shown. Over many shuffles, the correct answer lands in each of the four positions.
7. **First answer locks.** Only the first selection on a question counts. After it, every choice is disabled. Double-clicks, repeated taps, and repeated Enter/Space presses cannot change the answer or add to the score.
8. **Feedback copy, exactly:**
   - Correct: `Correct!` followed by the question's `fact`.
   - Incorrect: `Incorrect — the answer is <correctAnswer>.` followed by the question's `fact`.
   - On a wrong answer, both the student's choice and the correct answer are visibly marked. Correct and wrong are shown by text or an icon **as well as** colour, never by colour alone.
9. **Screens and flow.**
   - Start screen: the title `US Presidents Quiz`, a one-line description and a `Start quiz` button.
   - Question screen: shows `Question N of 10`.
   - `Next` button: appears only after an answer and moves to the next question. Nothing advances on a timer.
   - Results screen: shows `N / 10` and a `Play again` button. `Play again` starts a new random round with the score reset, without reloading the page.
10. **Responsive.** Fully usable at 320px viewport width with no horizontal scrolling. Answer buttons and `Next`/`Start`/`Play again` are at least 44×44 CSS px.
11. **Keyboard and screen reader.** A full round can be completed with the keyboard alone, and focus is always visible. The feedback text sits in an ARIA live region so screen readers announce it. After `Next`, focus moves to the new question.
12. **Automated tests.** Unit tests cover R3, R5, R6, R7 and scoring. They run with one command, documented in `README.md`, and pass. Randomness is injectable (seedable or mockable) so the tests are deterministic.
13. **No data collection.** No analytics, trackers, cookies, `localStorage`/`sessionStorage`, or third-party runtime requests other than static font/CDN assets, if any.
14. **Product-owner approval of the seed bank, recorded before QA1's audit.** Once the 12 seed questions are committed, Dev Team hands them to the product owner for review (via Master Controller). Master Controller writes the approval into the **Product owner approvals** section below. It names the commit SHA of the data file that was reviewed and quotes the product owner's words, and Master Controller commits it. This must happen **before** QA1 records a verdict: the approval edits this sprint file, and any edit after a QA1 PASS invalidates that PASS. If the seed data changes after approval, it needs approving again.

### Acceptance Criteria
*(QA1, static review. Numbers match the requirements.)*
1. The deploy mechanism and required Pages setting are documented in `README.md`. No asset reference in source or build output uses a root-absolute path (`/...`) that ignores the `/Test/` base. Every such reference is relative, or goes through a single configured base path.
2. The data file exists, is separate from app code, and every entry has exactly the R2 fields and types. The category values are exactly the four listed.
3. Tests exist that feed deliberately invalid entries (each violation from R3) and assert the check fails **and that its output message names the bad `id`**, not only that it exits non-zero. The real seed file passes.
4. The seed file has 12 entries, 3 per category. QA1 checks it against the R4 rules as written (no "current president" phrasing, and consistent numbering wherever Cleveland/Trump appear), but **does not certify historical accuracy.** That is R14's job.
5. Tests show: no repeats within a round, a round length of exactly 10, and ≥3 categories represented **when drawing from a synthetic bank skewed so a naive random draw would often fail that rule** (e.g. 30 questions in one category, 2 in each of the others).
6. A test over many shuffles shows the correct answer landing in all four positions and never stuck in a fixed slot.
7. A test (or code review of the handler, if a DOM test isn't practical) confirms a second selection on the same question changes neither the recorded answer nor the score. QA1 looks specifically for a double-fire race, e.g. a click handler that updates the score before disabling the choices.
8. The rendered strings match R8 character for character, including the em dash and the full stop. The correct/incorrect marking uses something other than colour (text, icon or `aria` label).
9. The code shows each screen and control in R9 with the exact labels. `Play again` resets the score and draws a new round without `location.reload()`.
10. The CSS has no fixed widths that force horizontal scrolling at 320px. The tap-target minimums are present.
11. Choices are real `<button>`s (or have the equivalent roles and key handling). A live region wraps the feedback. Focus moves as specified.
12. The documented test command runs and passes. QA1 runs it and doesn't just read it.
13. There are no analytics/tracker scripts, and no storage API or cookie use anywhere in the code.
14. The **Product owner approvals** section below is filled in, and its recorded SHA's version of the data file is identical to the version under audit (`git diff <recorded-sha> <audited-commit> -- <data file>` is empty). If it's missing or doesn't match, the verdict is FAIL.

### Live test criteria (LiveQA)
Run against the deployed `https://arjansahota02-bit.github.io/Test/`, not a local server:
- The URL loads, the page renders, and there are no 404s for any asset in the network panel. This confirms the R1 assumption for real.
- Play a full round and answer at least one question right and one wrong. Check that the feedback copy is exact, the score on the results screen matches what happened, and `Play again` gives a fresh round with the score reset and no page reload.
- Rapid double-click and double-tap an answer, and check that the score only moves by one.
- Play one full round by keyboard only.
- Play one round at 320px width with no horizontal scrolling. Use a real phone browser if you can get one. Otherwise use the browser's device emulation and record which was used. A real-device pass across several browsers is sprint 3's gate, not this one's.

### Out of Scope
- **The full ~100-question bank.** That's sprint 2, which writes against R2's format.
- **A formal WCAG 2.1 AA audit, performance budget, and real-device cross-browser matrix.** That's sprint 3. R10/R11 are the baseline here, not the full audit.
- **Accounts, saved scores, era filters, timers, free-text answers, analytics.** These are PRD non-goals for v1.
- **A custom domain.** v1 uses the default GitHub Pages URL.

### Dependencies
- Blocks: sprint 2 (full question bank; needs R2's format fixed), sprint 3 (polish & launch).
- Blocked by: nothing in sprint terms. Building can start now.
- External, required before `/sprint-ship` (not before `/sprint-start`):
  - **Git setup (Pipeman):** `C:\Programming\Test` is not a git repository yet. It has to be initialised and connected to `https://github.com/arjansahota02-bit/Test.git` before anything can be committed, audited against a commit, or pushed.
  - **GitHub Pages enabled on the repo (product owner):** set in the repository settings to whatever source R1's `README.md` names.
  - **Seed-bank review (product owner):** R14. It has to finish before QA1's gate.

### Team Assignments
- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned. Nothing else is running in parallel.

### Risks & Mitigations
- **Assets 404 under `/Test/` while working fine on localhost:** R1/AC1 ban root-absolute paths, and LiveQA tests the real Pages URL, never a local server.
- **A wrong fact in the seed bank reaches students:** R14 makes product-owner approval a hard precondition of QA1's PASS, tied to a specific SHA, so a question edited after approval can't slip through.
- **Flaky tests from randomness:** R12 requires injectable randomness.
- **Double-scoring from fast repeated input** (a known failure class on the downstream project this framework comes from): R7 and AC7 target it directly, and LiveQA exercises it live.
- **The data format changes after sprint 2 starts:** R2 fixes the format at this sprint's close. Any later change needs its own sprint, never an edit made in passing during sprint 2.

## Product owner approvals
*(Filled in by Master Controller only, per R14. Empty until the product owner has reviewed the seed bank.)*
- **Seed bank: APPROVED.** 2026-09-19. Reviewed file: `site/data/questions.json` at commit `fe1aca01952ed052a9d0446db297e5307e1d49fe` (12 questions, ids `order-001`–`003`, `events-001`–`003`, `party-001`–`003`, `quotes-001`–`003`). All 12 questions were shown to the product owner in full: question, correct answer, distractors and fact line. Master Controller also flagged two issues with citations (`source` values, never shown to students): `order-003`'s source is labelled "White House Historical Association" but links to whitehouse.gov, and `party-002`'s source is a bare domain (`supremecourt.gov`). The product owner was offered the choice of fixing these first and approved as-is. The product owner's words, verbatim: "Approved". **Any change to this file after `fe1aca0` voids this approval and requires re-review (R14).** The two citation issues are carried forward to sprint 2's source review, not fixed here.
