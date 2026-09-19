# PRD — US Presidents Quiz

**Status:** Approved by product owner, 2026-09-19
**Owner:** Product owner (the user) · **Author:** Master Controller
**Date:** 2026-09-19

---

## 1. Problem

History students need to learn a large set of facts about US presidents: order, terms, parties, vice presidents, major events and policies. Reading lists of facts doesn't make them stick. Answering questions and getting feedback right away does, but only if the feedback is correct.

## 2. Users

**Primary:** history students (high school / intro college level) practising on their own, on a laptop or a phone.
**Secondary:** teachers who share the link with a class. v1 builds nothing specifically for teachers.

## 3. Goals

1. A student can finish a 10-question round in a couple of minutes with no sign-up and no setup.
2. Every answer gets immediate feedback. On a wrong answer the student sees the correct answer and a short fact, so the round teaches as well as tests.
3. **Every correct answer in the bank is factually right.** For an education tool, a wrong "correct answer" is the worst possible defect. It is treated as a release blocker, not a cosmetic bug.

## 4. Non-goals (v1)

| Not building | Why |
|---|---|
| User accounts, login, saved progress, score history | Needs a backend and handling of student data; nothing in the goals requires it. |
| Browser-stored high scores | Explicitly deferred; each visit is a fresh quiz. |
| Teacher dashboard / class results | Depends on accounts. |
| Free-text answers | Grading ambiguity ("FDR" vs "Franklin D. Roosevelt"). Multiple choice keeps "correct" exact. |
| Era/topic filters, difficulty levels, timers, leaderboards | Useful later; not needed to prove the core loop. |
| Native mobile apps | The web app must work well in a phone browser instead. |
| Analytics / tracking | No data collection from students in v1. |

## 5. User flow

1. **Start screen:** title, one-line description, "Start quiz" button.
2. **Question screen** (×10): the question text, four answer choices, progress indicator ("Question 3 of 10").
3. **Student picks an answer.** The choices lock right away and feedback appears:
   - **Correct:** "Correct!" plus the question's fact line.
   - **Incorrect:** "Incorrect — the answer is *X*." plus the fact line. The chosen answer and the correct answer are both visibly marked.
4. **"Next" button** moves to the next question. Nothing advances on a timer; the student reads at their own pace.
5. **Results screen:** final score ("7 / 10") and a "Play again" button that starts a new random round.

## 6. Functional requirements

### Quiz engine
- **FR-1** A round is 10 questions drawn at random from the bank, with no question repeated within a round.
- **FR-2** Each round draws from at least 3 of the 4 categories (see §7), so a round isn't all one type.
- **FR-3** The four choices are shuffled every time a question is shown. The correct answer must not sit in a predictable position.
- **FR-4** Only the first answer selection counts. Once an answer is chosen, the choices lock (no changing answers, no double-scoring from repeated clicks or taps).
- **FR-5** The score counts correct first answers only. The results screen shows the correct count out of 10.
- **FR-6** "Play again" starts a completely fresh round (new draw, score reset) without reloading the page.

### Feedback
- **FR-7** Correct and incorrect feedback is shown as described in §5 step 3, including the question's fact line in both cases.
- **FR-8** Correct/incorrect is shown with text and an icon or marker, **not by colour alone**.

### Platform
- **FR-9** Static web app that runs in current Chrome, Safari, Firefox and Edge on desktop and mobile. No backend and no login.
- **FR-10** Usable at phone width (≥320px) without horizontal scrolling. Answer buttons are large enough to tap easily.
- **FR-11** The whole quiz can be played by keyboard alone, and feedback is announced to screen readers.

## 7. Content requirements

### Categories (all four in scope)
| Category | Examples |
|---|---|
| **Order & terms** | "Who was the 16th president?", "Who succeeded Lincoln?", years in office |
| **Key events & policies** | Emancipation Proclamation, Louisiana Purchase, New Deal |
| **Party, VP & biography** | party, vice president, home state, career before the presidency |
| **Quotes & trivia** | famous quotes, "firsts", notable facts |

### Bank
- **CR-1** About 100 questions at launch, at least 15 per category.
- **CR-2** Each question has: the question text, exactly one correct answer, three wrong answers (distractors), a one-line fact shown as feedback, its category, and a **source** (a reputable reference such as the White House, National Archives, Library of Congress or Miller Center). The source is kept in the data for review; it doesn't have to be shown to students.
- **CR-3** Distractors must be plausible (e.g. other presidents from a nearby era) but **clearly wrong**. A distractor that is arguably also correct is a defect.
- **CR-4** The bank lives in its own data file, separate from app code. Per CLAUDE.md, content changes never qualify for the trivial-fix fast lane.

### Known traps (reviewers must check these specifically)
- **Non-consecutive terms:** Grover Cleveland is both the 22nd and 24th president, and Donald Trump is both the 45th and 47th. Numbering questions and "who came after X" questions must be correct around these.
- **Time-sensitive facts:** anything about "the current president" or "the most recent" goes stale. Avoid those questions, or phrase them with a fixed date ("as of 2025…").
- **Quotes:** misattributed quotes are common. A quote question is included only if its source confirms the president actually said or wrote it.
- **Counting questions:** "how many presidents…" type questions have to follow the Cleveland/Trump numbering rules consistently.

### Accuracy review gate
- **CR-5** The engineers draft the bank. **The product owner reviews and approves it before it ships.** Approval is recorded explicitly (see Sprint plan below). QA1 and LiveQA check that the app shows the bank correctly. They are not historians and **do not stand in for the factual review.**

## 8. Non-functional requirements
- **NFR-1** The app loads and is playable within ~2 seconds on a typical mobile connection. It is a small static site with no heavy dependencies.
- **NFR-2** Collects and stores no personal data, and has no third-party trackers.
- **NFR-3** Accessibility: meets WCAG 2.1 AA for contrast, keyboard use, focus visibility and screen-reader announcements.

## 9. Success criteria (launch)
- A student can go from the landing page to the results screen on a phone with no instructions.
- The full bank has been approved by the product owner, with **zero known factual errors** at launch.
- Across repeated rounds, no question repeats within a round, and the correct answer is spread evenly across the four positions.
- The live test passes on at least one desktop browser and one real mobile browser.

## 10. Proposed delivery plan (for approval, not yet filed as sprints)

**Epic: US Presidents Quiz v1**

| Sprint | Scope | Notes |
|---|---|---|
| 1 — Quiz engine & UI | FR-1 through FR-11, built against a small seed bank (~12 questions, 3 per category) | Proves the whole loop end to end. The seed questions go through your review too. |
| 2 — Full question bank | CR-1 through CR-5: drafting ~100 questions plus your accuracy approval | A content sprint. It can't close until you have approved the bank in writing. |
| 3 — Polish & launch | NFR-1 through NFR-3, accessibility audit, cross-browser/mobile checks, production hosting | Could merge into sprint 1 if the teams find it small. |

Sprints 1 and 2 share the question data format, so **sprint 2 depends on sprint 1 fixing that format first**. They run one after the other, not in parallel.

## 11. Resolved decisions
1. **Hosting:** GitHub Pages, served from the repository `https://github.com/arjansahota02-bit/Test.git`, so the expected live URL is `https://arjansahota02-bit.github.io/Test/`. The app must work from the `/Test/` subpath, not the domain root. Initialising the local git repository and connecting this remote is Pipeman's job, and it has to happen before the first ship.
2. **Reviewer:** the product owner (the user) personally reviews and approves every question in the bank.
3. **Name:** "US Presidents Quiz" is the final title.
