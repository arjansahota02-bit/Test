# US Presidents Quiz

A static, no-login web quiz that teaches facts about US presidents through
10-question multiple-choice rounds with immediate feedback. Product spec:
[`docs/prd/us-presidents-quiz.md`](docs/prd/us-presidents-quiz.md).

Live site (once deployed): <https://arjansahota02-bit.github.io/Test/>

## Layout

| Path | What it is |
|---|---|
| `site/` | The entire published site. Plain HTML, CSS and ES modules, no build step and no dependencies. |
| `site/data/questions.json` | The question bank, kept separate from app code. |
| `site/js/quiz.js` | Quiz engine: round draw, choice shuffling, answer lock, scoring, feedback copy. No DOM. |
| `site/js/validate.js` | Question-bank validation, shared by the CLI check, the tests and the app itself. |
| `site/js/app.js`, `site/js/main.js` | DOM rendering and the browser entry point. |
| `tools/validate-questions.mjs` | Command-line bank check. |
| `tests/` | Unit tests (Node's built-in test runner). |

## Running the tests

Requires Node.js 22 or newer. There is nothing to install.

```bash
npm test
```

This runs every file in `tests/` and exits non-zero on any failure. Randomness
is injected into the engine, so the tests use a seeded generator and are
deterministic.

To check the question bank on its own:

```bash
npm run validate                                  # checks site/data/questions.json
node tools/validate-questions.mjs path/to/file.json
```

It prints one line per problem, each naming the offending question `id`, and
exits 1 if there are any.

## Running locally

Browsers block `fetch` of local files, so serve `site/` over HTTP rather than
opening `index.html` directly:

```bash
npx serve site        # or: python -m http.server --directory site
```

## Question format

`site/data/questions.json` is an array of entries with exactly these fields:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique (ignoring case and surrounding whitespace, so `order-001` and `ORDER-001` collide). |
| `category` | string | Exactly one of `order-terms`, `events-policies`, `party-vp-bio`, `quotes-trivia`. |
| `question` | string | |
| `correctAnswer` | string | |
| `distractors` | array of 3 strings | None may equal `correctAnswer` or each other. |
| `fact` | string | One line, shown as feedback after every answer. |
| `source` | string | A citation or URL, kept for review; not shown to students. |

Every comparison the validator makes ignores case and leading/trailing
whitespace: duplicate `id`s, a distractor equal to `correctAnswer`, and
duplicate choices among the four options.
This format is fixed by sprint 1; changing it needs its own sprint.

## Deployment (GitHub Pages)

The site is deployed by a GitHub Actions workflow,
[`.github/workflows/pages.yml`](.github/workflows/pages.yml). On every push to
`main` it runs the tests and the bank validation, then publishes the contents
of `site/` (and only `site/`) to GitHub Pages.

**Required repository setting:** Settings → Pages → *Build and deployment* →
**Source: GitHub Actions**. (Not "Deploy from a branch". With that source the
workflow's deploy step has nothing to publish to.)

The site is served from the `/Test/` subpath, not the domain root. Every asset
URL in `site/` is therefore relative (`styles.css`, `js/main.js`), and the
question data is fetched relative to the JavaScript module's own URL, so no
absolute `/…` path can point outside the subpath. Keep it that way: never add
a URL beginning with `/`.

## Privacy

No analytics, trackers, cookies, `localStorage`/`sessionStorage`, or
third-party requests. Fonts are the visitor's system fonts.
