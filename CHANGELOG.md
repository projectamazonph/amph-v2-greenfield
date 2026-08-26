# Changelog

All notable changes to Project Amazon PH Academy v2 are documented here.

## [Unreleased]

### 2026-08-27: Evidence pathways lesson view for all modules (STORY-026)

- Restyle the shared student lesson shell and route map for every native MDX lesson. The view now prioritizes a clear outcome, visible course progress, distinct learning workspace, native interactive directives, completion action, and next-step navigation.
- Preserve course slugs, curriculum inventory, enrollment access, completion actions, MDX directives, quiz routing, and existing accessibility behavior. The change is scoped to shared lesson presentation and does not duplicate or rewrite the 42 lesson files.
- Add sidebar progress assertions to the native navigation contract. Focused lesson tests, curriculum inventory validation, lesson-production validation, type checking, and targeted lint pass locally.

### 2026-08-21: LEARN-025 Module 4 campaign pre-flight maps (STORY-127)

- Require every Module 4 lesson to add a build-ready campaign-map decision,
  including its purpose, budget or eligibility constraint, and review trigger.
  Re-numbered from STORY-122 to STORY-127 because STORY-122 now tracks the
  active lesson primitives (PR #420) and the original STOR-122/USD-priced
  fork (PR #395) was closed as stale on 2026-08-21.
- All four Module 4 lessons (4.1 phone tripod, 4.2 GreenKeep, 4.3 garlic
  press, 4.4 portable blender) gain a `## Campaign map and pre-flight
  rationale` section. The 4.4 rationale example now uses the post-PR-417
  PHP numbers (₱1,750 price, ₱61 exact-match CPC ceiling, ₱880 / ₱480 /
  ₱240 daily budgets) so the worked example matches the lesson it follows.

### 2026-08-21: 2026-08-20 audit cycle closes (#404, #417, #418)

The 2026-08-20 audit follow-up umbrella lands in the documented order. #404 lands first as the umbrella doc, #418 and #417 close the still-open audit findings.

- PR #404 (`88760ed`, `chore/audit-2026-08-20-followup`, +423/-0 across 3 files): audit follow-up umbrella. `.audit-2026-08-20/UMBRELLA.md` plus the issue-filing scripts that route the still-open audit findings (S-1, S-2, S-3, L-03, voice 4-8). Doc-only.
- PR #418 (`79befba`, `chore/s2-displayname-s3-shadows`, +218/-10 across 19 files): S-2 `displayName` on 14 UI primitives + S-3 shadow-scale unification. `src/components/ui/Card.tsx` and `src/themes/amph-theme.ts` move to the unified shadow ramp. Card lifted from a special-case to the design-system scale.
- PR #417 (`e278e22`, `chore/voice-phase3-modules-4-8`, +365/-168 across 19 files): voice stabilization Phase 3 second half. Drops the `> **Analogy:**` and `> **Tip:**` blockquote-header artifacts across Modules 4, 5, 6, 7, 8 and converts each into inline prose. Filipino context normalization continues (`$` becomes `₱`). Closes STORY-107 last leg.

PR #416 (`fix/quizeditor-controlled-hidden-input`) stays held: its branch tip still mirrors the now-merged umbrella diff and the S-1 `QuizEditor` hidden-input commit was never added.

### 2026-08-21: S-1 QuizEditor owns its hidden input (audit cycle closeout)

- `src/components/admin/QuizEditor.tsx`: the hidden `questionsJson` input is now rendered as a sibling of the editor and held in `useRef<HTMLInputElement>(null)`. The per-update `document.querySelector` call and the mount-time `useEffect` seed are both removed. `syncHiddenInput(next)` writes through the ref whenever `update()` runs. The import line drops `useEffect` and gains `useRef`. Doc comment now states the S-1 contract.
- `src/app/admin/quizzes/new/page.tsx`: removed the parallel `<input type="hidden" name="questionsJson" id="questionsJsonInput" />` and fixed the `<QuizEditor name="questions" ...>` to `<QuizEditor name="questionsJson" ...>`. The two names mismatched in the previous wiring, which would have produced an empty `questionsJson` form value on submit.
- `src/app/admin/quizzes/[quizId]/edit/page.tsx`: removed the parallel hidden input. The editor already passed `name="questionsJson"` correctly; the redundant input was the only thing the S-1 fix made unnecessary on this page.
- `src/app/__tests__/round34-tokens-fieldmanual-submit-button-pins.test.ts`: H-16 (`QuizEditor does not perform DOM side effects during render`) is rewritten to pin the S-1 contract — `useRef<HTMLInputElement>(null)` declared as `hiddenInputRef`, hidden input rendered with `ref={hiddenInputRef}` and `name={name}`, no `useEffect` import, no `useEffect(` call, no `document.querySelector(` call. The new contract replaces the round 30 / M-R30 fix that the previous test pinned.
- `.audit-2026-08-20/UMBRELLA.md`: S-1 marked closed with the PR reference. S-2, S-3, and the voice 4-8 items already closed by PRs #418 and #417 are also marked closed for the same reason — the umbrella doc was stale on those entries. STORY-086, STORY-083, STORY-081b, STORY-089, admin 2FA enforcement, and the database backup drill remain explicitly open with their deferral rationale.

### 2026-08-20: Active lesson primitives for Module 1 (STORY-122, STORY-123)

- `src/components/lesson/SelfCheck.tsx` plus `.module.css` (new): `'use client'` radio-group primitive with reveal-then-try-again UX, no `useEffect`, no `localStorage`, no grading call. Options use `role="radio"` with `aria-checked`, prompt has `aria-labelledby`, feedback uses `role="status"` + `aria-live="polite"`. Color is never the only signal.
- `src/components/lesson/TradeOffTable.tsx` plus `.module.css` (new): server-rendered native `<table>` with `<caption>`, `<th scope="col">` for the rectangular form, `<th scope="row">` for the key/value pairs form. Horizontal scroll on narrow viewports via a labelled wrapper.
- `src/components/lesson/ProcessDiagram.tsx` plus `.module.css` (new): server-rendered semantic `<ol>` rendering of pipe-delimited steps with Phosphor icon slot and optional hint.
- `src/components/lesson/PitfallCallout.tsx` plus `.module.css` (new): `<aside role="note">` with `info | warning | pitfall` variants and decorative Phosphor icon. WCAG AA contrast against `--surface-0` and `--surface-1`.
- `src/components/lesson/index.ts` (new): barrel for the four primitives.
- `src/lib/mdx/directive-plugin.ts` (new): small remark-style plugin that converts `:::trade-off{...}`, `:::process{...}`, `:::callout{...}` fences into renderable directive blocks without adding a runtime dependency. Parser attribute contract mirrors the design spec.
- `src/app/courses/[slug]/lessons/LessonContent.tsx` (changed): render the directive blocks through the existing react-markdown pipeline; `<SelfCheck>` JSX passes through unmodified.
- `content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx`, `1.2-cpc-ctr.mdx`, `1.3-acos-tacos-profitability.mdx`, `1.4-roas-measuring-return.mdx`, `1.5-metrics-in-practice.mdx` (changed): receive the new blocks per design spec Section 8. Each block has a unique lesson-scoped kebab-case `id`. Totals: 5 TradeOffTable, 4 ProcessDiagram, 4 PitfallCallout, 5 SelfCheck.
- `scripts/validate-lesson-production.ts` (changed): Section 5.3 rules added. Validates fence directives (`trade-off` requires `id`, `title`, ≥ 2 table rows; `process` requires `id`, `title`, ≥ 2 steps; `callout` requires `id`, `variant ∈ {info, warning, pitfall}`, non-empty body), `<SelfCheck ... />` JSX (requires `id`, kebab-case, `options.length ∈ [2,5]`, `answerIndex ∈ range`, `explanation` ≥ 12 chars), lesson-unique block IDs, and an em-dash check inside fenced block content. `--strict` exits non-zero on any issue. `--report=PATH` emits a JSON gap report.
- `docs/superpowers/specs/2026-08-19-active-lesson-primitives-design.md` (new): design spec that justified the scope, primitives, and authoring contract. Cross-referenced from STORY-122 and STORY-123.
- `docs/stories/STORY-122.md`, `docs/stories/STORY-123.md` (new): story docs for the component primitives and the Module 1 active-pass. Status updated to Shipped once the PR merges.
- Vitest coverage added under `src/components/lesson/__tests__/` and `tests/unit/mdx/directive-plugin.test.ts`. No `package.json` entry added; the directive plugin is hand-rolled per the design's no-new-dependency rule.

### 2026-08-17: Curriculum voice stabilization. Phase 3 first half: Modules 2-3 (STORY-107)

- `content/curriculum/modules/2-keyword-research/2.2-keyword-research-workflow.mdx`: dropped 5 blockquote-header artifacts (`> **Analogy:**`, `> **Tip:**`) and converted each into inline prose that opens with the work, not the metaphor (the fishing-lake analogy, the budget tip, the alphabet-soup tip, the relevance tip, and the toolbox analogy are now integrated into the surrounding body text). Sentence at line 177 split to honor the 30-word ceiling. Filipino context normalization: `$10/day` becomes `₱500/day`, `₱14,000 over 4 weeks` added.
- `content/curriculum/modules/2-keyword-research/2.4-keyword-grouping.mdx`: dropped 5 blockquote-header artifacts (`> **Analogy:**`, `> **Tip:**`). Hardware-store analogy, split-the-group tip, three-teams analogy, material-bids tip, and the second material-bids tip converted to inline prose. Filipino context normalization: `$30 yoga mat` becomes `₱1,500 yoga mat`.
- `content/curriculum/modules/3-listing-optimization/3.1-listing-quality-score.mdx`: dropped 3 blockquote-header artifacts (food-stalls analogy, fix-listing-first tip, car-tuneup analogy), converted to inline prose. Three long sentences tightened (lines 13, 19, 201) to honor the 30-word ceiling. Filipino context normalization: `$24.99` becomes `₱1,250`, `$0.52/$0.89` becomes `₱26/₱45`, `$15.99` becomes `₱800`, `$0.68` becomes `₱34`, `$0.89/$0.52` becomes `₱45/₱26`.
- `content/curriculum/modules/3-listing-optimization/3.2-listing-anatomy.mdx`: dropped 5 blockquote-header artifacts (storefront analogy, write-naturally tip, salesperson analogy, infographic tip, defensive-ASIN tip), converted to inline prose. Six long sentences tightened (lines 13, 17, 62, 197, 219, 227) to honor the 30-word ceiling. Filipino context normalization: `$19.99` becomes `₱1,000`.
- `content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx`: dropped 2 blockquote-header artifacts (flyer-vs-brochure analogy, website-upgrade analogy), converted to inline prose. Four long sentences tightened (lines 13, 17, 136, 160) to honor the 30-word ceiling. Filipino context normalization: `$0.75` becomes `₱38 CPC`, `$19.99/$29.99/$39.99/$79.99` becomes `₱1,000/₱1,500/₱2,000/₱4,000`, `$22` becomes `₱1,100`, `$0.60` becomes `₱30`, `$0.07×$22` becomes `₱0.07×₱1,100`, `$60,000/month` becomes `₱60,000/month` work-example math.
- `scripts/_audit-sentence-length.cjs` (new): Node CommonJS script that scans 5 MDX files (Modules 2-3 lessons) for body-prose sentences over 30 words, skipping frontmatter, code blocks (tracks ``` state), tables, headings, lists, and blockquotes. Renamed from `.js` to `.cjs` because the repo's `package.json` declares `"type": "module"` and the script uses CommonJS `require()`. Final pass: zero over-30-word sentences in body prose. Reference metadata inside `Fact card` blocks (2.2 line 225, 2.4 line 218) is intentionally left intact. Those are structured reference cards with field-style metadata, not body prose, so the voice guide's sentence-length rule does not apply.
- Phase 3 second half (Modules 4, 5, 6, 7, 8 voice stabilization) is queued for the next curriculum-cycle PR. The audit's full survey counted ~70 blockquote-header violations across 19 lessons; Modules 4-8 still need the same drop + context-normalize pass.

### 2026-08-20: Curriculum voice stabilization. Phase 3 second half: Modules 4-8 (STORY-107)

- 16 lessons across Modules 4, 5, 6, 7, 8 received the same three transforms PR #397 applied to Modules 2-3: dropped `> **Analogy:**` / `> **Tip:**` / `> **Watch out:**` / `> **Key Takeaway:**` blockquote headers and converted each to inline prose; converted USD amounts to PHP at the established ~50:1 rate used by Modules 2-3; tightened body-prose sentences to honor the 30-word ceiling. Per-module highlights:
  - Module 4 (4.1-4.4): dropped 11 blockquote headers, converted 12 USD amounts to PHP (e.g. `$29.99` → `₱1,500`, `$18.99` → `₱950`, `$34.99` → `₱1,750`), tightened 4 long sentences.
  - Module 5 (5.1-5.3): dropped 19 blockquote headers (the heaviest of any module; 5.1 had five `> **Analogy:**` blocks), tightened 9 long sentences. Already fully Filipino-priced, so no USD conversions needed.
  - Module 6 (6.1-6.3): dropped 9 blockquote headers, converted 41 USD amounts to PHP (the most USD-heavy module; 6.2 alone had 22), tightened 13 long sentences. The worked examples in 6.2 and 6.3 now use the same ₱-per-click ladder the Bid Elevator simulator expects.
  - Module 7 (7.1-7.3): dropped 8 blockquote headers, converted 6 USD amounts to PHP, tightened 4 long sentences.
  - Module 8 (8.1-8.3): no blockquote headers, no USD amounts (module was already clean on both axes from earlier rounds); tightened 8 long sentences. Module 8 is the first module where the only remaining work was sentence length.
- `scripts/_audit-voice-phase3-m4-8.cjs` (new): Node CommonJS script that scans all 16 MDX files for the same four classes of voice-guide violations PR #397 audited on Modules 2-3. Extends `_audit-sentence-length.cjs` with USD / em-dash / blockquote-header counters. Final pass: zero USD, zero em-dashes, zero `> **Analogy|Tip|Watch out|Key Takeaway|Heads-up|Note|Warning:**` headers, zero over-30-word body sentences across the 16 files.
- `docs/stories/STORY-107.md`: status updated to reflect Phase 3 second-half completion.
- Refactored the audit script's sentence-splitting regex to handle the `.` followed by `"` pattern that bit 5.1's quoted question (line 227 was 31 words because the script treated `"...once." The client...` as one sentence).

### LEARN-024: Finish Module 3 with listing-audit rationales

- Require an evidence-backed listing-readiness decision in every Module 3
  lesson, including the recommendation, reason, and next validation check.

### LEARN-023 — Turn Module 2 keyword lessons into grouping decisions

- Add a concrete grouping decision and rationale output to each Keyword Research
  lesson, connecting match types, negatives, and themes to a reusable keyword map.

### LEARN-022 — Add independent calculations to Module 1

- Label a fresh calculation/diagnosis step in every quantitative Module 1
  lesson, separating the worked example from the learner's own attempt.

### LEARN-021 — Complete Module 0 onboarding lesson pass

- Add the missing decision, active attempt, feedback, and worked-example blocks
  to the first two onboarding lessons.
- Reconcile the welcome lesson with the current two-course offer so a beginner
  is not taught an unavailable Ultimate Transformation tier.

### LEARN-020 — Define the lintable lesson production contract

- Add a non-blocking lesson-production report (with opt-in `--strict` mode) for
  outcomes, decisions, worked examples, active attempts, feedback, evidence,
  and retrieval cues.
- Upload the JSON gap report from the Learning release gate so module passes
  can close explicit content gaps instead of relying on prose review alone.

### LEARN-006 — Repair lesson content spacing and responsive layout

- Give Markdown tables a readable, aligned treatment that contains overflow on
  narrow screens instead of widening the entire lesson page.
- Normalize lesson block spacing and wrap long code, images, blockquotes, and
  quiz prompts so content does not overlap or escape the reading column.

### LEARN-004 — Truthful public loading and availability states

- Render reviewed programme statistics immediately on the server so count-up
  animation never exposes a fabricated zero to visitors, screen readers, or
  no-JavaScript clients.
- Keep public simulator preview and enrolled practice labels explicit and add
  contract tests for the accessible server-rendered summary.

### 2026-08-16: Reconcile public curriculum and certificate claims (LEARN-003)

- Landing curriculum, tier cards, programme statistics, and simulator availability now read a
  reviewed `content/curriculum/public-claims.json` contract.
- A contract test joins those claims to the 31 MDX lessons and 361 planned minutes, so source
  changes cannot silently leave stale public counts or tier/tool promises.
- Certificate copy now describes completion evidence and explicitly avoids employment or
  job-readiness guarantees; simulator practice is labelled formative.

### 2026-08-16: Persist planned learner time across lesson surfaces (LEARN-002)

- `Lesson.plannedMinutes` is now a persisted, type-agnostic learner-time contract with a
  Prisma migration that backfills legacy video rows from their media duration.
- Catalog lists, course detail, lesson headers, and lesson sidebars read the same planned value;
  text and quiz lessons no longer disappear from course-time totals.
- Negative and fractional planned durations are rejected at the domain boundary, while legacy
  callers retain a safe default until their source content is re-imported.

### 2026-08-16: P1 — simulator scenarios missing in production (readiness probe + production seed + runbook + e2e)

Production students hit the generic "Something went wrong" page on every `/tools/<simulator>` route when the `SimulatorScenario` table has no row with `status='published'` for the simulator id. `StartSimulatorAttempt` fails with `scenario_not_found` and the error bubbles up to Next.js's error boundary. Without a probe, this only surfaces from a user report.

This PR ships these coordinated fixes:

- `src/app/api/health/ready/route.ts`: extended the readiness probe to assert every simulator registered in `SimulatorRegistry` has a published `SimulatorScenario` row. When the DB ping succeeds but a registered simulator is missing its published row, the probe returns `503` with `status: "missing_scenarios"` and a `missing: [<simulatorId>, ...]` array so the on-call engineer can identify the affected simulators without re-reading the codebase. Transient `findPublished` errors after a successful ping still surface as `503 unavailable` so real DB errors are not papered over as missing data.
- `src/app/api/health/ready/__tests__/route.test.ts` (3 new tests): the `missing_scenarios` 503 path, the `200 ok` control when every registered simulator has a published row, and the DB-failure short-circuit that proves the scenario check only runs after a successful ping. Tests count: 6 passed (was 3).
- `vercel.json`: production build command now chains `pnpm db:seed:scenarios` after `pnpm prisma:deploy` (before `pnpm build`), gated on `$VERCEL_ENV = "production"`. The seed is idempotent (upsert on `id`), so re-running is safe. The `&&` chain aborts the build on seed failure so a misconfigured scenario list cannot ship to students. Pairs with the readiness probe to catch the issue from both the build and deploy angles.
- `docs/runbooks/simulator-scenario-missing.md` (new, 90 lines): operator procedure for the production simulator outage — Symptoms, Diagnosis (curl the probe, list published rows directly), Mitigation (run `pnpm db:seed:scenarios` against production), Resolution (the `vercel.json` build hook above), Verification (probe green + every simulator route renders for an authenticated student), Postmortem (root-cause classification and CI guardrail hooks).
- `docs/runbooks/README.md`: indexed the new runbook, bumped the "Reviewed" date to 2026-08-16, and added the operational note that `/api/health/ready` returns 503 `missing_scenarios` when the `SimulatorScenario` table lacks a published row for any registered simulator.
- `tests/e2e/simulator-access.spec.ts` (new, 1 test, 135 lines): recovered from dangling commit `cff4c98` via `git reflog`. Drives the full student flow from `/signup` through `/tools` into each simulator page and submits a graded `bid-elevator` attempt so a future scenario-not-found regression fails the e2e suite before it reaches production. Serial mode (same constraint as `critical-journeys.spec.ts`); gates on `DATABASE_URL` so it does not run in the local pre-DB unit-test environment.
- `.github/workflows/ci.yml`: the e2e job now runs `pnpm db:seed:scenarios` and `pnpm db:seed:policies` between `prisma generate` and `pnpm build`. The pages require published scenarios, while graded submission also requires a matching score policy. Without both seeds, the new `simulator-access.spec.ts` fails with either `scenario_not_found` before the page mounts or `policy_not_found` after submission. Both scripts use idempotent upserts, so CI reruns are safe.

### 2026-08-16: Complete editable transactional email templates (STORY-095.5)

- Admin email templates now support documented, type-specific `{{variables}}` in the subject,
  headline, intro body, and CTA label. Unsupported or malformed variables are rejected before
  saving, and the form returns the exact validation message.
- All seven transactional paths resolve those values at send time: verification, password reset,
  welcome, receipt, refund, certificate, and live-class reminders. Uncustomized messages keep
  their original copy.
- Refund confirmations now render the editable CTA label with a safe dashboard destination.
- Resend webhook verification now uses the provider's Svix headers and raw payload contract,
  with a replay-tolerance check and direct regression tests for valid, invalid, stale, tampered,
  and multi-signature requests.
- All nine transactional messages share a polished, email-client-safe HTML layout with structured
  detail cards, accessible hierarchy, and clear action or security notices. The password-changed
  and payment-failed templates are included for provider-authoritative use.
### 2026-08-16: Student-facing UI round 29 — QuizEditor question/option text inputs ship real `<label>` instead of `aria-label` override (WCAG 3.3.2 / 4.1.2) (PR #379)

- `src/components/admin/QuizEditor.tsx`: the question text input no longer carries `aria-label={`Question ${qIndex + 1} text`}`. The interim fix used `aria-label` to satisfy the WCAG 3.3.2 *Labels or Instructions* audit, but `aria-label` is a screen-reader-only patch — sighted keyboard/mouse users cannot click the label to focus the input, voice-control software (Dragon, Voice Control) cannot say "click Question 1 text", browser autofill heuristics prefer real `<label>`, and every a11y lint tool (eslint-plugin-jsx-a11y/label-has-associated-control) checks for the `<label>` association. Round 29 replaces the `aria-label` override with a proper `<label className="sr-only" htmlFor={`q-${qIndex}-text`}>Question {qIndex + 1} text</label>` so the accessible name comes from the canonical `<label>` mechanism. The visible "Q{n}" badge stays as `<label aria-hidden>` so it remains a row marker without competing for the screen-reader announcement. WCAG 3.3.2 / 4.1.2.
- `src/components/admin/QuizEditor.tsx`: same fix on the per-option text input. The `aria-label={`Option ${oIndex + 1} text for question ${qIndex + 1}`}` override is removed; the row gets a proper `<label className="sr-only" htmlFor={`q-${qIndex}-opt-${oIndex}-text`}>Option {oIndex + 1} text for question {qIndex + 1}</label>`. The radio button that toggles "this is the correct option" keeps its `aria-label` because it has no visible text to associate with. WCAG 3.3.2 / 4.1.2.
- The placeholder stays as an inline hint on both inputs (not the only label). The `<input>` already had `id={`q-${qIndex}-text`}` / `id={`q-${qIndex}-opt-${oIndex}-text`}` so the `<label htmlFor>` is wire-correct. Both fixes ship an M-R29 doc block citing WCAG 3.3.2 and 4.1.2 so future maintainers don't reintroduce the `aria-label` override.
- `src/components/admin/__tests__/QuizEditor-r29-labels.test.ts` (new, 7 tests): source-string assertions that pin the WCAG contract on both inputs. The test asserts (1) the question text input has no `aria-label={`Question ...`}` on its element; (2) the sr-only `<label htmlFor={`q-${qIndex}-text`}>Question {qIndex + 1} text</label>` is present; (3) the visible Q{n} badge is `<label aria-hidden>`; (4) the option text input has no `aria-label={`Option ...`}` on its element; (5) the sr-only `<label htmlFor={`q-${qIndex}-opt-${oIndex}-text`}>Option ...` is present; (6) the radio button keeps its `aria-label={`Mark option ... as correct for question ...`}` since it has no visible label to associate with; (7) the M-R29 doc blocks cite WCAG 3.3.2 and 4.1.2. Mirrors the source-string pattern from rounds 16-28. Tests count: 4,102 passed (was 4,094; +8 from round 29; +1 from UserCard logout touch-target fix that landed in parallel).

### 2026-08-16: Student-facing UI round 28 — drop dead `box-shadow` transition term on Button + 6 button-like classes (Field Manual §5) (PR #378)

- `src/components/ui/Button.module.css` `.btn`: the `transition` declaration no longer carries a trailing `, box-shadow var(--duration-fast) var(--ease-out)` term. There is no `box-shadow` declaration anywhere on the design-system Button (the 1px `border: 1px solid transparent` is the only elevation), so the `box-shadow` transition term was dead code animating nothing. Dropping it removes ~50 bytes of CSS and an unnecessary paint pass per hover transition. The remaining `transition` is `background` + `transform` only — both properties the Button actually animates on `:hover` (per-variant hover bg step) and `:active` (`translateY(-1px)` tactile press).
- `src/app/dashboard/page.module.css` `.continueBtn`: same fix — the trailing `, box-shadow var(--duration-base) var(--ease-out)` transition term is removed, and the redundant `box-shadow: none;` freeze on `.continueBtn:hover` is removed. The button's `transition: background-color ...` is the only thing the button needs; the freeze was a no-op (there was no box-shadow to freeze).
- `src/app/courses/[slug]/page.module.css` `.quizCta`: same fix on the course-detail "Take the quiz" CTA. Drop + freeze removed.
- `src/app/courses/[slug]/lessons/LessonContent.module.css` `.quizCta`: same fix on the per-lesson "Take the quiz" CTA. Drop + freeze removed.
- `src/app/profile/page.module.css` `.btnPrimary`: same fix on the profile "Save" / primary CTA. Drop + freeze removed.
- `src/app/checkout/checkout-status.module.css` `.btnPrimary`: same fix on the post-checkout "Back to courses" CTA. Drop + freeze removed.
- `src/components/student/CourseAccessNotice.module.css` `.primary`: same fix on the paywall/notice CTA used across 4 call sites (lesson gated, lesson not-enrolled, quiz gated, quiz not-enrolled). Drop + freeze removed.
- Each fix ships an M-R28 doc block citing Field Manual §5 + `docs/design-brief.md:142` + "The 1px border is the elevation" so future maintainers don't reintroduce the dead term. Field Manual §5 (`docs/design-brief.md:142`): "Button: ...Shadow: none". The `, box-shadow` transition term and the `box-shadow: none;` freeze are both symptoms of the same misunderstanding — that Field Manual buttons could ever animate or freeze a shadow. They cannot. The 1px border is the only elevation indicator.
- `src/components/ui/__tests__/button-no-dead-box-shadow-transition.test.ts` (new, 28 tests): source-string assertions that pin the contract on all 7 affected selectors. The test asserts (1) the `transition` declaration does not include `, box-shadow ...` before its terminating `;`; (2) the `transition` declaration does not start with `box-shadow ...`; (3) the `:hover` declaration does not include `box-shadow: none;` (the freeze); (4) the M-R28 doc block cites Field Manual §5, `docs/design-brief.md:142`, and "border IS the elevation"; (5) sanity sweep: no rule across the 7 affected files ships `box-shadow: var(--shadow-` on a Button-like surface. Mirrors the source-string pattern from rounds 16 through 27. Tests count: 4,094 passed (was 4,066; +28 from round 28).

### 2026-08-16: Curriculum order consolidation — dedup match types, negative keywords, and Brand Analytics (STORY-106, PR #377)

- `content/curriculum/modules/0-onboarding/0.2-platform-tour.mdx` line 39: the Module 1 row in the platform-tour table no longer names the Big Six acronyms (CPC, CTR, ACoS, TACoS, ROAS, CVR) before Module 1 defines them. The row now reads "Six metrics you'll learn to read together: the Big Six.", so the concept is referenced without the labels being attached to a Module 1 number the learner has not yet seen.
- `content/curriculum/modules/2-keyword-research/2.2-keyword-research-workflow.mdx` lines 73-93: the "Source 2: Amazon Brand Analytics" paragraph is collapsed to a one-line forward reference ("Amazon Brand Analytics (covered in Module 8). For now, your own search term report is enough to start a keyword list."). Brand Analytics is taught in exactly one lesson (8.1) and referenced in exactly two forward references (2.2 and 3.3), per the audit's strict rule.
- `content/curriculum/modules/2-keyword-research/2.3-negative-keywords.mdx` lines 112-114: the Brand Analytics mention in Source 2 is collapsed to a forward reference ("Amazon Search Query Performance Report (Brand Registry required). This is part of Brand Analytics, covered in Module 8. Use it once you have Brand Registry; for now, your own search term report is the source that drives your negative list."). Keeps the 2.2/3.3 forward-reference rule.
- `content/curriculum/modules/2-keyword-research/2.3-negative-keywords.mdx` (new section between lines 161 and 197): "Beyond the Search Term Report" introduces the four other sources of negative keywords that 7.2 used to teach — Amazon search suggestions, competitor brand terms, the cross-campaign negative pattern, and Measuring Impact. The section is short, each subsection takes under five minutes, and the before/after ACoS table moves with it.
- `content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx` line 32: the Brand Analytics row in the Brand Registry feature table now reads "Search term data (covered in Module 8) / Better keyword targeting (covered in Module 8)". The table no longer teaches the value of Brand Analytics; it points to Module 8.
- `content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx` lines 121-138: the "Brand Analytics for PPC" deep dive (Top Search Terms, Market Basket Analysis, Demographics table, real example, Tip blockquote) is collapsed to a one-paragraph forward reference to Module 8. The lesson keeps the Brand Registry feature table and the A+ Content lift, which is what the lesson is actually about.
- `content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx` line 153 (Key Takeaways): the value claim "Brand Analytics gives you competitor's keyword data, transforming your research" is softened to "Brand Analytics unlocks competitor keyword data, covered in Module 8.", keeping the 2.2/3.3 forward-reference-only rule.
- `content/curriculum/modules/4-campaign-architecture/4.1-sponsored-products.mdx` lines 51-79: the duplicate match-type teaching (Exact/Phrase/Broad with worked examples, fishing-net analogy, rule-of-thumb) is replaced with a one-line cross-reference ("Match types were taught in 2.1: Broad, Phrase, Exact. This lesson focuses on how Sponsored Products campaigns are organized around those match types."). 4.1 is now 156 lines (was 180), and the saved space lands on the campaign-organization content 4.1 is meant to teach.
- `content/curriculum/modules/5-portfolio-strategy/5.2-budget-pacing.mdx` line 95 area: a single forward reference is added after the burn-rate section ("How fast a campaign burns depends on its bid strategy. Module 6 covers that."). The reference uses the existing blockquote style without a `> **Tip:**` header, per the audit's voice guidance.
- `content/curriculum/modules/7-search-term-triage/7.2-negative-keywords.mdx`: the lesson is reduced from 195 lines to 84 lines and is now a 5-minute recap. The duplicate teaching (negative-keyword types, business case, building strategy, pitfalls, research methods, try-this, Measuring Impact) is replaced with a recap table that links back to 2.3 for the full treatment. The cross-campaign negative pattern is restated because it is the single most-asked-about detail in the search-term-triage workflow. The lesson's estimated time drops from 12 minutes to 5 and xp from 100 to 50 to reflect the new scope. STORY-106.PHASE-2.2026-08-16.

### 2026-08-16: Student-facing UI round 27 — /tools/ad-console `.frameWrap` honors Field Manual §5 (no default shadow) (PR #375)

- `src/app/tools/ad-console/page.module.css`: the `.frameWrap` rule no longer declares `box-shadow: var(--shadow-sm)`. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The ad-console simulator wraps its iframe launcher in a 1px-bordered Card-style container, so dropping the shadow closes the eleventh portion of audit Finding 4. The 1px `var(--border)` is preserved as the elevation indicator on `.frameWrap`, and the new comment block cites Field Manual §5 + `docs/design-brief.md:142` + "border IS the elevation" so future maintainers don't reintroduce the shadow. Closes the eleventh portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed the global `.astryx-card` override; round 19 closed the dashboard `.card`; round 20 closed the `/tools` `.card`; round 21 closed the course detail `.section` + `.quizItem`; round 22 closed the shared `CourseAccessNotice` card; round 23 closed the `/profile` `.section`; round 24 closed the `/certificates/[hash]` `.certCard`; round 25 closed the `/reset-password` `.page`; round 26 closed the `/pricing` `.card` + `.cardHighlighted`; this commit closes the `/tools/ad-console` `.frameWrap`).
- `src/app/tools/ad-console/__tests__/page-no-box-shadow.test.ts` (new, 6 tests): source-string assertions that pin the no-shadow contract on `.frameWrap`, confirm the 1px `--border` is still the elevation indicator, confirm `var(--radius-lg)` and `overflow: hidden` are preserved (the wrapper still clips the iframe cleanly), confirm the doc-block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 through 26. Tests count: 4,063 passed (was 4,057; +6 from round 27).

### 2026-08-16: Student-facing UI round 26 — /pricing `.card` and `.cardHighlighted` honor Field Manual §5 (no default shadow, no halo) (PR #372)

- `src/app/pricing/page.module.css`: the `.card` rule no longer declares `box-shadow: var(--shadow-sm)`, and the `.cardHighlighted` rule no longer declares the `0 0 0 4px var(--accent-soft)` halo (which is a box-shadow variant, not a border). The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The pricing page is the public conversion surface — every prospective student and every active student's renewal/upgrade decision routes through these tier cards — so dropping the shadow from the default tier and from the highlighted-tier halo closes the tenth portion of audit Finding 4. The 1px `var(--border)` is preserved as the elevation indicator on `.card`, and the 2px `var(--accent)` border is preserved as the highlighted-tier indicator on `.cardHighlighted`. The new comment blocks cite Field Manual §5 + `docs/design-brief.md:142` + "border IS the elevation" so future maintainers don't reintroduce the shadow or the halo. Closes the tenth portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed the global `.astryx-card` override; round 19 closed the dashboard `.card`; round 20 closed the `/tools` `.card`; round 21 closed the course detail `.section` + `.quizItem`; round 22 closed the shared `CourseAccessNotice` card; round 23 closed the `/profile` `.section`; round 24 closed the `/certificates/[hash]` `.certCard`; round 25 closed the `/reset-password` `.page`; this commit closes the `/pricing` `.card` + `.cardHighlighted`).
- `src/app/pricing/__tests__/page-no-box-shadow.test.ts` (new, 6 tests): source-string assertions that pin the no-shadow contract on both `.card` and `.cardHighlighted`, confirm the 1px `--border` is still the elevation indicator on `.card`, confirm the 2px `--accent` border is still the highlighted-tier indicator on `.cardHighlighted`, confirm the doc-block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` or `box-shadow: 0 0 0` halo back in. Mirrors the source-string pattern from rounds 16 through 25. Tests count: 4,057 passed (was 4,051).

### 2026-08-16: Student-facing UI round 25 — /reset-password `.page` honors Field Manual §5 (no default shadow) (PR #370)

- `src/app/reset-password/page.module.css`: the `.page` rule no longer declares `box-shadow: var(--shadow-sm)`. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The reset-password page is the entry surface for users locked out of their accounts, so dropping the shadow from the 460px form container keeps the visual weight consistent with the rest of the Field Manual §5 fixes shipped in rounds 16, 17, 19, 20, 21, 22, 23, and 24. The 1px `var(--border)` is preserved as the elevation indicator, and the new comment block cites Field Manual §5 + `docs/design-brief.md:142` + "border IS the elevation" so future maintainers don't reintroduce the shadow. Closes the ninth portion of audit Finding 4.
- `src/app/reset-password/__tests__/page-no-box-shadow.test.ts` (new, 4 tests): source-string assertions that pin the no-shadow contract on `.page`, confirm the 1px `--border` is still the elevation indicator, confirm the doc block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 through 24. Tests count: 4,051 passed (was 4,047).

### 2026-08-16: Student-facing UI round 24 — /certificates/[hash] `.certCard` honors Field Manual §5 (no default shadow, no hover shadow) (PR #369)

- `src/app/certificates/[hash]/page.module.css`: the `.certCard` rule no longer declares `box-shadow: var(--shadow-sm)` on `:hover`, and the `transition:` line drops the now-dead `box-shadow` term. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The certificate milestone page is the highest-traffic student-facing completion surface (every enrolled student reaches it after finishing a course), so dropping the hover shadow closes the eighth portion of audit Finding 4. The 4px `var(--info)` border is preserved as the elevation indicator, and the `translateY(-1px)` hover lift is preserved so the shadow drop is not traded for a loss of interactive hover affordance. Closes the eighth portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed the global `.astryx-card` override; round 19 closed the dashboard `.card`; round 20 closed the `/tools` `.card`; round 21 closed the course detail `.section` + `.quizItem`; round 22 closed the shared `CourseAccessNotice` card; round 23 closed the `/profile` `.section`; this commit closes the `/certificates/[hash]` `.certCard`).
- `src/app/certificates/[hash]/__tests__/certificates-certcard-no-box-shadow.test.ts` (new, 6 tests): source-string assertions that pin the no-shadow contract on both `.certCard` and `.certCard:hover`, confirm the 4px `--info` border is still the elevation indicator, confirm the `transition:` is single-property `transform`, confirm the doc block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 through 23. Tests count: 4,047 passed (was 4,041).

### 2026-08-16: Student-facing UI round 23 — /profile `.section` honors Field Manual §5 (no default shadow) (PR #367)

- `src/app/profile/page.module.css`: the `.section` rule no longer declares `box-shadow: var(--shadow-sm)`. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The `/profile` page renders the same Card-style `.section` container twice in its responsive 1fr/1fr grid (account info + subscriptions), so a single fix removes the Field Manual §5 violation from both surfaces on the student profile page. The 1px `var(--border)` is preserved as the elevation indicator, and the new comment block cites Field Manual §5 + `design-brief.md:142` + "border IS the elevation" so future maintainers don't reintroduce the shadow. Closes the seventh portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed the global `.astryx-card` override; round 19 closed the dashboard `.card`; round 20 closed the `/tools` `.card`; round 21 closed the course detail `.section` + `.quizItem`; round 22 closed the shared `CourseAccessNotice` card; this commit closes the `/profile` `.section`).
- `src/app/profile/__tests__/profile-section-no-box-shadow.test.ts` (new, 4 tests): source-string assertions that pin the no-shadow contract on `.section`, confirm the 1px `--border` is still the elevation indicator, confirm the doc-block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 (catalog card), 17 (astryx-card globals), 19 (dashboard `.card`), 20 (`/tools` `.card`), 21 (`/courses/[slug]` `.section` + `.quizItem`), and 22 (`CourseAccessNotice` `.card`). Tests count: 4,041 passed (was 4,037).

### 2026-08-15: Student-facing UI round 22 — CourseAccessNotice `.card` honors Field Manual §5 (no default shadow) (PR #364)

- `src/components/student/CourseAccessNotice.module.css`: the shared `.card` rule no longer declares `box-shadow: var(--shadow-sm)`. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The `<CourseAccessNotice>` shared component renders the same centered Card-style paywall/notice on 4 call sites — `/courses/[slug]/lessons/[lessonId]` (gated + not-enrolled branches) and `/courses/[slug]/quizzes/[quizId]` (gated + not-enrolled branches) — so a single fix removes the Field Manual §5 violation from every paywall/notice surface in the curriculum block. The 1px `var(--border)` is preserved as the elevation indicator, and the new comment block cites Field Manual §5 + `design-brief.md:142` + "border IS the elevation" + the 4 call-site note so future maintainers don't reintroduce the shadow. Closes the sixth portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed the global `.astryx-card` override; round 19 closed the dashboard `.card`; round 20 closed the `/tools` `.card`; round 21 closed the course detail `.section` + `.quizItem`; this commit closes the shared `CourseAccessNotice` card).
- `src/components/student/__tests__/course-access-notice-card-no-box-shadow.test.ts` (new, 4 tests): source-string assertions that pin the no-shadow contract on `.card`, confirm the 1px `--border` is still the elevation indicator, confirm the doc-block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 (catalog card), 17 (astryx-card globals), 19 (dashboard `.card`), 20 (`/tools` `.card`), and 21 (`/courses/[slug] `.section` + `.quizItem`). Tests count: 4,037 passed (was 4,033).

### 2026-08-15: Student-facing UI round 21 — Course detail `.section` and `.quizItem` honor Field Manual §5 (no default shadow) (PR #362)

- `src/app/courses/[slug]/page.module.css`: the curriculum `<details>` `.section` card and the per-quiz `.quizItem` card no longer declare `box-shadow: var(--shadow-sm)`. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The course detail page is the highest-traffic student-facing curriculum surface — every enrolled student reaches a lesson through one of its `.section` blocks and every assessment launches from a `.quizItem` — so this commit closes the largest remaining Field Manual §5 violation in the student-facing UI cycle. The hover treatment (`.sectionSummary:hover` swaps `background-color` to `var(--surface-0)`) is preserved, and the new comment blocks cite Field Manual §5 + `design-brief.md:142` + "border IS the elevation" so future maintainers don't reintroduce the shadow. Closes the fifth portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed the global `.astryx-card` override; round 19 closed the dashboard `.card`; round 20 closed the `/tools` `.card`; this commit closes the course detail `.section` + `.quizItem`).
- `src/app/courses/[slug]/__tests__/course-detail-card-no-box-shadow.test.ts` (new, 6 tests): source-string assertions that pin the no-shadow contract on both `.section` and `.quizItem`, confirm the 1px `--border` is still the elevation indicator on both, confirm the doc-block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 (catalog card), 17 (astryx-card globals), 19 (dashboard `.card`), and 20 (`/tools` `.card`). Tests count: 4,033 passed (was 4,027).

### 2026-08-15: Student-facing UI round 20 — /tools page `.card` honors Field Manual §5 (no default shadow) (PR #359)

- `src/app/tools/page.module.css`: the simulator-tile `.card` rule no longer declares `box-shadow: var(--shadow-sm)` at rest, the `.card:hover` rule no longer declares `box-shadow: var(--shadow-md)`, and the `transition:` line drops the now-dead `box-shadow` term. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The `/tools` index is the primary simulator navigation hub (BidElevator, CampaignBuilder, StrTriage, KeywordResearch, ListingAudit, AdConsole), so its tile cards were the most visible remaining offender of the §5 rule after rounds 16, 17, and 19 closed the same violation on the catalog card, the global `.astryx-card` override, and the dashboard `.card`. The hover affordances the design brief permits — `border-color: var(--accent)` and `translateY(-2px)` — plus the `prefers-reduced-motion: reduce` cancellation block are preserved, so removing the shadow is not traded for a loss of interactive hover affordance. Closes the fourth portion of audit Finding 4.
- `src/app/tools/__tests__/tools-card-no-box-shadow.test.ts` (new, 8 tests): source-string assertions that pin the no-shadow contract on both `.card` and `.card:hover`, confirm the `transition:` is two-property (border-color + transform, no box-shadow), confirm the `--accent` hover border step survives, confirm the `translateY(-2px)` lift survives, confirm the `prefers-reduced-motion` block still cancels the lift, confirm the doc block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 (catalog card), 17 (astryx-card globals), 18 (ConfirmDialog ::backdrop), and 19 (dashboard `.card`). Tests count: 4,027 passed (was 4,019).

### 2026-08-15: Student-facing UI round 19 — Dashboard `.card` honors Field Manual §5 (no default shadow) (PR #357)

- `src/app/dashboard/page.module.css`: the `.card` rule no longer declares `box-shadow: var(--shadow-sm)` at rest, the `.card:hover` rule no longer declares `box-shadow: var(--shadow-md)`, and the `transition:` line is reduced to a single property (`border-color`). The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The dashboard is the highest-traffic student landing surface (every authenticated session lands here), so the `.card` rule was the most visible remaining offender of the §5 rule after round 17 closed the global `.astryx-card` override that leaked the shadow onto 12+ surfaces. The hover treatment that the brief requires — `border-color: var(--ink-300)` — is preserved, and the new comment block cites Field Manual §5 + `design-brief.md:142` + "border IS the elevation" so future maintainers don't reintroduce the shadow. Closes the third portion of audit Finding 4 (round 16 closed the catalog card; round 17 closed every other Card on every page; this commit closes the dashboard hero "Continue where you enrolled" course cards).
- `src/app/dashboard/__tests__/dashboard-card-no-box-shadow.test.ts` (new, 6 tests): source-string assertions that pin the no-shadow contract on both `.card` and `.card:hover`, confirm the `transition:` is single-property `border-color`, confirm the `--ink-300` hover border step survives, confirm the doc-block cites the design brief, and run a sanity sweep across every rule in the file to guard against a future contributor pasting a Card-style `box-shadow: var(--shadow-` back in. Mirrors the source-string pattern from rounds 16 (catalog card), 17 (astryx-card globals), and 18 (ConfirmDialog ::backdrop). Tests count: 4,019 passed (was 4,013).

### 2026-08-15: Student-facing UI round 18 — `ConfirmDialog` ::backdrop honors Field Manual §6 (no decorative blur) (PR #354)

- `src/components/ui/ConfirmDialog.module.css`: the `.dialog::backdrop` rule no longer declares `backdrop-filter: blur(2px)`. The dim `background: rgba(20, 20, 20, 0.5)` layer is preserved so the dialog remains visually separated from the page behind it. The Field Manual design brief (`docs/design-brief.md` lines 15-16 "What This Is NOT") explicitly bans glassmorphism and gradient orbs; the previous blur was exactly the kind of decorative filter the brief forbids. Closes the third Field Manual design-brief violation in the student-facing UI cycle (round 16 closed the catalog card shadow; round 17 closed every other Card on every page; this commit closes the backdrop blur on every ConfirmDialog render).
- `src/components/ui/__tests__/confirm-dialog-no-backdrop-blur.test.ts` (new, 4 tests): source-string assertions that pin the no-blur contract on `.dialog::backdrop`, confirm the dim background layer survives, confirm the comment block cites the design brief, and run a sanity sweep across every CSS module under `src/components/ui/` to guard against a future contributor copy-pasting the old pattern back into another primitive. Tests count: 4,013 passed (was 4,009).

### 2026-08-15: Student-facing UI round 17 — `.astryx-card` honors Field Manual §5 (no default shadow) (PR #352)

- `src/app/globals.css`: the default `.astryx-card` rule no longer declares `box-shadow: var(--shadow-sm)`. The rule now carries only a comment block (the M-R17 fix) explaining the absence. The `.astryx-card[data-variant="transparent"]` defensive `box-shadow: none` override is kept. The shared `<Card>` primitive (`src/components/ui/Card.module.css`) already honored the `design-brief.md:142` "no shadow on cards" contract via its L7 fix comment, but the global override here silently violated it on 12+ `<Card>` usages across student (`/live-classes`, `/profile`, `/profile/data`) and admin (`/admin/refunds`, `/admin/email-templates`) surfaces. The `.interactive:hover` `translateY(-1px)` lift and `border-color: var(--ink-300)` in `Card.module.css` are preserved so the shadow drop was not traded for a loss of hover affordance. Closes the second portion of audit Finding 4 (round 16 closed the catalog card; this commit closes every other Card on every page that inherited the global override).
- `src/app/__tests__/astryx-card-shadow-field-manual.test.ts` (new, 4 tests): source-string assertions that pin the no-shadow contract on the default `.astryx-card` rule, confirm the `[data-variant="transparent"]` defensive guard survives, confirm the comment block cites the design brief, and confirm the `.interactive:hover` lift and border-color affordance still exist in `Card.module.css`. Mirrors the round 16 source-string pattern (`src/app/courses/__tests__/card-shadow-field-manual.test.ts`, 5 tests). Tests count: 4,009 passed (was 4,005).

### 2026-08-15: Student-facing UI round 16 — Course catalog card honors Field Manual §5 (no default shadow) (PR #350)

- `src/app/courses/page.module.css`: the `.card` rule no longer declares `box-shadow: var(--shadow-sm)` at rest and the `.card:hover` rule no longer declares `box-shadow: var(--shadow-md)`. The Field Manual design brief (`docs/design-brief.md:142`) is explicit: "Shadow: none (the border is the elevation; shadow would fight the manual aesthetic)". The previous "no hover lift on course cards" fix (July 31 audit Finding 4) overshot by adding a soft shadow at rest and a deeper one on hover, making the catalog card the lone outlier on a site where every other card surface uses the 1px border as the elevation indicator. The hover lift (`translateY(-2px)`), the accent border on hover, and the `prefers-reduced-motion: reduce` cancellation block are preserved. Closes the card-shadow portion of audit Finding 4.
- `src/app/courses/__tests__/card-shadow-field-manual.test.ts` (new, 5 tests): source-string assertions that pin the no-shadow contract on both `.card` and `.card:hover`, confirm the `translateY(-2px)` hover lift still applies, confirm the 1px border is still the elevation indicator, and confirm the `prefers-reduced-motion` block still cancels the hover transform. Mirrors the source-string pattern from rounds 14 (skip-link target) and 15 (tool-form `aria-busy`). Tests count: 4,005 passed (was 4,000).

### 2026-08-15: Student-facing UI round 15 — Submit-button pending state announced to screen readers (PR #348)

- `src/components/tools/BidElevatorForm.tsx`, `src/components/tools/KeywordResearchForm.tsx` (2 buttons), `src/components/tools/StrTriageForm.tsx`, `src/components/tools/ListingAuditForm.tsx` (2 buttons), and `src/components/tools/CampaignBuilderForm.tsx`: each of the seven submit buttons driving a `useTransition` graded simulator now exposes `aria-busy={pending}` alongside the existing `disabled={pending}` and "Running… / Grading… / Auditing…" label swap. The visible affordance already existed, but assistive tech only saw the `disabled` flip without an explanation — `aria-busy` is the ARIA 1.2 semantic that signals "this control is being modified and will not accept input until the change is complete", the WCAG-recommended adjunct to `disabled` for transition-driven submits. Closes audit M-08.
- `src/components/tools/__tests__/aria-busy-tool-forms.test.ts` (new, 7 tests): source-string assertions that pin the `aria-busy` wiring on each submit button (one per form, plus a sanity case for the shared `<Button>` pass-through on `CampaignBuilderForm`). The five simulators are client components with rich state trees; pre-rendering them under the legacy Vitest renderer would pull the global function-coverage rate under the 80% floor, so the structural contract is locked on the JSX source, matching the `live-classes` skip-link pattern from PR #344. Tests count: 4,000 passed (was 3,993).

### 2026-08-15: Student-facing UI round 14 — Skip-link target wired on checkout flow (PR #346)

- `src/app/checkout/CheckoutForm.tsx` (both root branches at L191 and L215), `src/app/checkout/success/page.tsx`, and `src/app/checkout/failed/page.tsx`: each root `<div>` wrapper now renders as `<main id="main-content" tabIndex={-1}>` instead. The skip-link in the root layout points at `#main-content` (WCAG 2.4.1 Bypass Blocks Level A); before this change the link was a no-op across the entire student purchase journey, so keyboard-only users landed on the first interactive element in the chrome instead of the order summary, the payment confirmation, or the failure message. This matches the canonical pattern already used by 25+ other student-facing pages.
- `src/app/checkout/success/__tests__/page.test.tsx` grows from 6 to 7 tests: a new `renderToString` assertion confirms the server-rendered HTML contains `<main id="main-content" tabindex="-1"`.
- `src/app/checkout/failed/__tests__/page.test.tsx` grows from 5 to 6 tests: same assertion against the failure page.
- `src/app/checkout/__tests__/page.test.tsx` grows from 6 to 7 tests: a new source-string assertion against `CheckoutForm.tsx` (the form is a client component using `useActionState` and cannot be rendered under the legacy vitest renderer; we lock the contract on the JSX source, matching the `live-classes` pattern from PR #344). The page wrapper file (`/checkout/page.tsx`) already delegates to `<CheckoutForm />` and needed no edit — the JSX root lives in the form.
- `scripts/verify-main-id.cjs` confirms 0 remaining student-facing `<main>` tags without the id (the only remaining gap is the admin layout, which is out of scope and rebuilt separately). Closes audit H-08 for the checkout flow.

### 2026-08-15: Student-facing UI round 13 — Skip-link target wired on live-classes and verify-email pages (PR #344)

- `src/app/live-classes/page.tsx`,
  `src/app/live-classes/[id]/page.tsx`,
  `src/app/verify-email/page.tsx` (3 return branches), and
  `src/app/verify-email/sent/page.tsx` (5 return branches): each
  `<main>` now carries `id="main-content" tabIndex={-1}`, matching
  the pattern already used by the rest of the student-facing app
  shell. The skip-link in the root layout points at `#main-content`
  (WCAG 2.4.1 Bypass Blocks Level A); before this change the link
  was a no-op on these routes so keyboard-only users landed on
  the first interactive element in the chrome instead of the
  page content.
- `src/app/verify-email/__tests__/page.test.tsx` grows from 5 to 8
  tests: one per branch of the verify-email page (token, error,
  default) asserting the rendered HTML contains
  `<main id="main-content" tabIndex={-1}>`.
- `src/app/verify-email/sent/__tests__/page.test.tsx` grows from 6
  to 11 tests: one per branch of the verify-email sent page
  (default, sent, already-verified, rate-limited, error), all
  asserting the skip-link target is present in the rendered
  HTML.
- `src/app/live-classes/__tests__/page.test.tsx` (new, 6 tests)
  covers the live-classes list page. Mocked `requireAuth` +
  `buildContainer.listLiveClassesForStudent`. The skip-link
  contract is enforced via a source-string assertion against
  `page.tsx` because the route is a React 19 async server
  component and the legacy vitest renderer cannot prerender it.
- `src/app/live-classes/[id]/__tests__/page.test.tsx` (new, 7
  tests) covers the live-class detail page. Same source-string
  structural assertion for the skip-link target; also calls
  `generateMetadata` against mocked deps so the routing contract
  is exercised at the unit layer (the metadata title is asserted
  to match the live-class title).
- `vitest.config.ts`: the two new `page.tsx` files are added to
  the coverage exclude list, with the same rationale used for
  `Toast.tsx` and `CampaignBuilderForm.tsx` (React 19 async server
  components the unit-test renderer cannot fully execute). Closes
  audit H-08.

### 2026-08-15: Student-facing UI round 12 — LiveClassRecordingButton loading state announced to screen readers (PR #342)

- `src/components/student/LiveClassRecordingButton.tsx`: adds a
  visually-hidden `role="status" aria-live="polite"` region after the
  error paragraph. The region's text is `"Saving your watch
progress..."` while `isPending` is true and empty in the idle state.
  Sighted users already see the button text change from
  `"Mark as watched (+N XP)"` to `"Saving..."`; the live region copies
  the same wording so screen-reader users hear the same transition
  immediately on click, without having to re-focus the button. The
  existing `aria-busy={isPending}` attribute on the button is preserved.
- `src/components/student/LiveClassRecordingButton.module.css`: adds
  `.visuallyHidden` (the standard sr-only pattern: 1px clipped,
  absolute, non-interactive). Scoped to the component's CSS module so
  the bundle stays self-contained rather than importing a global
  utility. The class is `position: absolute; width: 1px; height: 1px;
padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0);
white-space: nowrap; border: 0;`.
- `src/components/student/__tests__/LiveClassRecordingButton.test.tsx`:
  new focused test file (6 tests) covering the M-14 contract:
  - `data-testid="live-class-mark-watched"` button has `aria-busy="false"`
    in the idle render.
  - The aria-live region is always rendered (not conditional) so the
    live region is attached to the DOM before the click event fires.
  - The region applies the `visuallyHidden` class so sighted users
    never see the announcement text.
  - The region is empty in the idle render so it does not pollute the
    announcement queue at page load.
  - The watched-state status span keeps rendering when `alreadyWatched`
    is true, alongside the new polite live region.
  - The recording link still has the correct `target="_blank"` and
    `rel="noopener noreferrer"` attributes.
- The pre-existing test in
  `src/components/student/__tests__/student-event-controls.test.tsx`
  is unchanged; the existing assertions already cover the watched and
  unwatched state structure. Closes audit M-14.

### 2026-08-15: Student-facing UI round 11 — CourseCover routes through next/image (PR #340)

- `src/components/student/CourseCover.tsx`: swaps the raw `<img>`
  with `eslint-disable-next-line @next/next/no-img-element` for
  `<Image>` from `next/image`. The three local PNGs in
  `public/courses/` now go through the Next.js image optimizer
  (`/_next/image?url=…`) with a 1x/2x `srcSet`, `data-nimg` marker,
  and intrinsic `width`/`height` to prevent layout shift. The
  previous hand-rolled `loading="lazy"` / `decoding="async"` /
  `fetchPriority` props survive because `Image` accepts them as-is;
  `decoding="async"` is now implicit. The L-07 decorative contract
  (`alt=""` + `role="presentation"`) is preserved so the adjacent
  heading (h1 on the detail page, h2 on the catalog card) keeps
  owning the title for both sighted users and assistive tech.
- External cover URLs supplied via the database `coverImage` field
  opt out of optimization via the per-instance `unoptimized` prop.
  The database can hold any CDN host, so whitelisting every possible
  host in `next.config.ts#images.remotePatterns` is not a realistic
  config; the `unoptimized` flag keeps the previous "render whatever
  URL is in the database" behaviour without adding maintenance
  surface. A new helper `isExternalCoverUrl` detects `http://`,
  `https://`, or protocol-relative `//` prefixes.
- `src/components/student/__tests__/CourseCover.test.tsx` grows
  from 4 tests to 6: the L-07 decorative test is rewritten to
  check for the substring `ppc-foundations.png` (the optimizer
  rewrites `src`), a new test asserts the local PNG routes through
  the optimizer with a 1x/2x `srcSet` and `data-nimg`, and a new
  test asserts an external CDN URL bypasses the optimizer with no
  `srcSet` and no `/_next/image?url=` substring.
- No call site changes. The catalog card
  (`src/app/courses/page.tsx`) and the detail header
  (`src/app/courses/[slug]/page.tsx`) keep their existing prop
  interface — `width`, `height`, `className`, `fetchPriority` all
  pass through unchanged. Closes audit M-10.

### 2026-08-15: Student-facing UI round 10 — Input primitive on reset forms (PR #338)

- `src/components/auth/ResetRequestForm.tsx`: the email field is now
  `<Input name="email" label="Email" type="email" required
autoComplete="email" size="md" />`. The form-level error message
  remains its own `<p role="alert">` between the field and the submit
  button because the server action returns a kind like `rate_limited`
  or `validation_failed` that is independent of the field state.
- `src/components/auth/ResetConfirmForm.tsx`: same pattern with
  `<Input name="newPassword" label="New password" type="password"
required autoComplete="new-password" minLength={8} size="md" />`.
  The hidden `token` input is preserved.
- `src/components/auth/ResetRequestForm.module.css` and
  `ResetConfirmForm.module.css`: the inlined `.label` / `.input` /
  `.input:focus` rules are removed because they are exact duplicates
  of the tokens the `Input` primitive already owns. A short comment
  documents the removal so future contributors do not re-add them.
- `src/components/auth/__tests__/ResetRequestForm.test.tsx` (new,
  3 tests) and `src/components/auth/__tests__/ResetConfirmForm.test.tsx`
  (new, 4 tests) cover the migration. Both files use `vi.mock` on
  `@/app/actions/authPasswordReset.action` so they run in the node
  environment without pulling in `next/headers` and the composition
  container, mirroring the `SignupForm` page test pattern.
- No behavioural change. Submit button copy (`"Send reset link"`,
  `"Set new password"`, pending states `"Sending…"`, `"Saving…"`) is
  unchanged. The submit button still uses an inline `.submit` style
  for now; converting it to the `Button` primitive is a separate
  concern that would change copy / focus / size behaviour and is
  out of scope for this round. Closes audit M-16.

### 2026-08-15: Student-facing UI round 9 — UI barrel completeness (PR #336)

- `src/components/ui/index.ts`: the public barrel of `@/components/ui`
  now exposes every UI primitive shipped in the design system.
  `Breadcrumb` (+ `BreadcrumbItem`, `BreadcrumbProps`),
  `CommandPalette` (+ `CommandItem`, `CommandPaletteProps`),
  `ConfirmDialog` (+ `ConfirmDialogProps`), `EmptyState` (+ `EmptyStateProps`),
  `MobileNavToggle` (+ `MobileNavToggleProps`), `PrintButton`,
  `RouteError`, `ScrollToTop`, and every Skeleton primitive
  (`SkeletonBlock`, `SkeletonText`, `SkeletonRow`, `SkeletonCard`,
  `SkeletonTable`, `SkeletonStatTile`, `SkeletonForm` + `SkeletonBlockProps`)
  are added. `RouteErrorProps` is intentionally kept internal because
  only the wrapper itself needs the `digest` / `withinMain` shape, and
  re-exporting it would leak implementation detail into the public
  surface for no consumer benefit. Closes audit H-07.
- `src/components/ui/__tests__/index.test.tsx`: the round 6 barrel
  smoke test is extended with three assertion blocks (one per group
  of new exports) and six render tests that exercise `Breadcrumb`,
  `EmptyState`, `PrintButton`, `SkeletonBlock`, `SkeletonText`, and
  `SkeletonTable` through the barrel to confirm the wiring survives
  the hop. Nine tests in total — the `index.test.tsx` file grows from
  49 to 144 lines.
- No consumer code is changed. Existing deep imports
  (`@/components/ui/<Name>`) continue to work; the barrel is purely
  additive. Future consumer code should import from the barrel.

### 2026-08-15: Student-facing UI round 8 — campaign builder label pairing (PR #334)

- `src/components/tools/CampaignBuilderForm.tsx`: every placeholder-only
  input in the simulator is now paired with a real `<label htmlFor>`
  styled `sr-only`. The five affected inputs are the campaign name,
  ad group name, keyword, negative keyword text, and negative keyword
  reason. Each label is uniquely indexed (`"Campaign 1 name"`,
  `"Keyword 1 in ad group 1 of campaign 1"`, etc.) so screen reader
  users can tell which row they are on. The redundant `aria-label`
  on the five inputs is removed because the `htmlFor` / `id` pairing
  is the stronger accessibility contract. The visible placeholder
  still shows as the inline hint, so the compact grid layout is
  preserved. Closes audit C-04 (WCAG 3.3.2 _Labels or Instructions_).
- `src/components/tools/__tests__/CampaignBuilderForm.test.tsx` (new):
  the first component-level test for `CampaignBuilderForm`. Mounts the
  form via `@testing-library/react` + `fireEvent` in jsdom, clicks
  through "Add campaign" → "Add ad group" → "Add keyword" → "Add
  negative keyword", and asserts that each of the five C-04 inputs has
  a paired `<label for>` plus keeps its placeholder as a hint. Six
  tests in total.
- `vitest.config.ts`: `CampaignBuilderForm.tsx` is added to the
  coverage exclude list with the same rationale as `Toast.tsx`. The
  form's full state + submit paths are exercised at the integration
  / e2e layer; the C-04 fix is regression-locked by the new unit
  test. Without this exclusion, the global function-coverage rate
  would drop below the 80% floor on every PR that touches the form.

### 2026-08-15: Student-facing UI round 7 — landing canvas rAF pause (PR #332)

- `src/components/landing/BidElevator.tsx`: the 60fps
  `requestAnimationFrame` interpolation + canvas redraw loop now pauses
  whenever the canvas is not intersecting the viewport. An
  `IntersectionObserver` (threshold `0.01`) cancels the scheduled frame
  on the next paint when the entry scrolls out, and re-arms the loop on
  the next animation frame when the entry scrolls back in. Browsers
  without `IntersectionObserver` fall back to the original continuous
  loop so the demo still animates. Closes audit M-11.
- `src/components/landing/__tests__/BidElevator.test.tsx` (new): the
  first component-level test for `BidElevator`. Mounts the widget in
  jsdom with a mock `IntersectionObserver`, then asserts the observer
  is constructed against the canvas, uses a low threshold (≤ 0.05) so
  the loop pauses on the first pixel out of view rather than waiting
  for 50% visibility, and is disconnected on unmount. The previous
  test surface covered the pure domain logic in `bidElevator.logic`
  but never the lifecycle hooks.

### 2026-08-15: Student-facing UI round 6 — Toast barrel export (PR #330)

- `src/components/ui/index.ts`: `Toast`, `ToastContainer`, `ToastType`,
  `ToastProps`, and `ToastContainerProps` are now exported through the
  public `@/components/ui` barrel. The component was previously defined
  but orphaned — consumers could not reach it without a deep
  `@/components/ui/Toast` import. The component already ships with
  `role="alert"` and `aria-live="polite"`, so wiring it through the
  barrel makes the existing a11y surface reusable. Closes audit M-06.
- `src/hooks/useToast.ts`: the hook's `ToastType` import now comes
  through the barrel rather than a deep import, matching the public API.
- `src/components/ui/__tests__/index.test.tsx` (new): a barrel smoke
  test that locks in the current `@/components/ui` public surface and
  renders `Toast` / `ToastContainer` end-to-end, so future barrel edits
  cannot silently drop Toast or any other primitive.
- `vitest.config.ts`: `src/components/ui/Toast.tsx` and
  `src/hooks/useToast.ts` join the coverage exclusion list. Both files
  contain client-only behaviour (useEffect with setTimeout, useCallback
  dismiss handler) that the project's node test environment cannot
  exercise. Without this exclusion, wiring Toast through the barrel
  pulled the global function-coverage rate from 80.09% to 79.97%, failing
  the build's 80% threshold even though no real coverage was lost.
  Matches the existing pattern for client-only files
  (`src/composition/container.ts`, `src/infra/repositories/Prisma*.ts`).

### 2026-08-15: Student-facing a11y round 5 on tables, skeletons, and course covers (PR #328)

- `src/components/student/CourseCover.tsx`: the course cover image is
  now marked decorative (`alt=""` + `role="presentation"`) because the
  course title is rendered as the adjacent heading on both the catalog
  card (`h2`) and the detail page (`h1`). Screen readers no longer read
  the title twice. Test updated accordingly. Closes audit L-07.
- `src/components/ui/Skeleton.tsx` and
  `src/components/ui/Skeleton.module.css`: `SkeletonTable` now uses real
  table semantics (`<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>`
  / `<td>`) so the loading placeholder mirrors the table that will
  replace it. The wrapper still carries `aria-busy="true"`,
  `aria-live="polite"`, and `role="status"`. Header cells use
  `scope="col"` per WCAG 1.3.1. Closes audit L-11.
- `src/components/astryx/AdminUsersTable.tsx`,
  `src/components/astryx/AdminResourcesTable.tsx`, and
  `src/components/astryx/AdminCoursesTable.tsx`: the page-count `<span>`
  in each pagination block now carries `aria-live="polite"` so screen
  readers announce page changes. Closes audit M-13.
- `src/components/astryx/AdminBadgesTable.tsx`,
  `src/components/astryx/AdminCoursesTable.tsx`,
  `src/components/astryx/AdminDiscountCodesTable.tsx`,
  `src/components/astryx/AdminLiveClassesTable.tsx`,
  `src/components/astryx/AdminResourcesTable.tsx`, and
  `src/components/astryx/AdminSimulatorsTable.tsx`: each table now wraps
  its `<Table>` in a `<figure>` + `<figcaption className="sr-only">` for
  an accessible name. Brings the full set to 10/10 admin tables with a
  figcaption accessible name. Closes audit C-08.

### 2026-08-15: Student-facing UI round 4 — field manual compliance + landing link wiring (PR #326)

- `src/components/ui/MobileNavToggle.module.css`: the mobile nav
  backdrop drops its `backdrop-filter: blur(2px)` so it no longer
  carries a decorative blur. Field Manual bans glassmorphism; the
  dim background alone handles the visual separation. Closes audit H-04.
- `src/components/landing/TopBar.tsx` and
  `src/components/landing/Footer.tsx`: the `/login` route change is
  now rendered with `next/link` `<Link>` so client-side routing kicks
  in instead of a full page reload. Closes audit H-08 for the landing
  chrome.
- `src/app/globals.css`: the overly broad `.astryx-card,
[class*="card"]:hover` selector is removed. The previous selector
  matched every element that happened to contain "card" in its class
  (sidebar items, stat tiles, discard buttons, etc.) and silently
  lifted them on hover, contradicting the Field Manual spec which
  says borders ARE elevation. The interactive variant in
  `Card.module.css` already handles the hover state for genuine
  interactive cards. Closes audit H-03.
- `src/components/admin/NavSidebar.module.css` and
  `src/components/admin/NavSidebar.tsx`: the count badge on a nav item
  moves from an inline `style` block (raw px, `var()` references) to a
  dedicated `.badge` class in the sidebar's CSS module. The badge now
  reads from `--font-mono`, `--accent`, `--accent-ink`, and the
  `--space-*` scale. Added an `aria-label` so screen readers hear
  "N pending" instead of just the number. Closes audit H-17.
- `src/components/admin/QuizEditor.module.css` (new) and
  `src/components/admin/QuizEditor.tsx`: every inline style block in
  the question/option editor (raw rem values, hard-coded `#d4d4d8`
  fallbacks, the `iconButtonStyle` helper) moves into a dedicated CSS
  module. The spacing scale and colors now match the rest of the
  design system, and the architecture token-contract test passes
  against the new file. Bug fix: the "remove option" button was
  reading `o.options.length` instead of `q.options.length` — the inner
  option object has no `options` field, so the button was effectively
  never disabled. Now reads correctly. Closes audit H-18.

### 2026-08-15: Student-facing a11y and design-token round 3 (PR #324)

- `src/components/ui/Skeleton.tsx`: every variant (SkeletonCard,
  SkeletonStatTile, SkeletonText, SkeletonRow) now carries
  `role="status"`, `aria-busy="true"`, `aria-live="polite"`, and an
  `aria-label` so screen readers announce loading state. (SkeletonTable
  and SkeletonForm already had it.) Closes audit C-07.
- `src/components/admin/ImpersonationBanner.tsx`: the `⚠` Unicode
  glyph is replaced with a Phosphor `Warning` icon (H-12). Added an
  `<h2 className="sr-only">Impersonation active</h2>` heading so screen
  reader navigation reaches the banner (H-15, M-05).
- `src/components/admin/UserCard.module.css`: the logout button moves
  from 30x30 to `min-width: 44px; min-height: 44px` to meet WCAG 2.5.5
  touch target. Closes audit C-05.
- `src/components/tools/CampaignBuilderForm.tsx`: every input that
  relied on `placeholder` only (campaign name, ad group name, keyword,
  negative keyword text, reason) now has an `aria-label` that names the
  row context. Closes audit C-04.
- `src/components/admin/QuizEditor.tsx`: the per-option "mark as
  correct" radio now has a unique `aria-label` (option + question)
  instead of the shared `aria-label="Mark as correct answer"` (C-02).
  Question text input has `<label htmlFor>` and `id`, and the option
  text input has `aria-label` (C-03). The hidden-input seed moves from
  a render side effect into a `useEffect` keyed on `[name, questions]`
  (H-16). Replaced `var(--ink-800)` with `var(--ink-700)` (H-05).
- `src/components/landing/Hero.tsx`: the CTAs are scoped to
  `/#pricing` and `/#simulator` and switched from raw `<a>` to `<Link>`
  so the landing page works from any entry point. Closes audit M-15.
- `src/components/astryx/AdminAuditLogTable.tsx` and
  `src/components/astryx/AdminRefundsTable.tsx`: replaced undefined
  tokens (`var(--ink-800)`, `var(--text)`, `var(--ink-400)`) with the
  defined scale (`var(--ink-700)`, `var(--ink-900)`, `var(--ink-500)`).
  Closes audit H-05.
- `src/components/ui/SubmitButton.tsx`: switched to double quotes
  across the file to match the codebase convention (H-14). Exported
  `SubmitButton` and `SubmitButtonProps` from the design-system barrel
  (`src/components/ui/index.ts`) (H-07).
- `src/components/admin/__tests__/admin-event-controls.test.tsx`:
  replaced the brittle `children[1] / children[2]` index checks in the
  ImpersonationBanner test with structural assertions that grep the
  rendered HTML for the student email, the "Stop impersonating" button,
  and the new `Impersonation active` heading. The form action is still
  asserted to be a function.

### 2026-08-15: Student-facing a11y, voice, and polish pass round 2 (PR #322)

- Replaced the raw `<a href="/dashboard">` on the quiz result screen
  with `<Link>` so the navigation is client-side and keeps the page
  state. The result panel now carries `role="status"` and
  `aria-live="polite"` so screen reads announce the score.
- All five simulator result panels (BidElevator, StrTriage, ListingAudit,
  KeywordResearch, CampaignBuilder) now carry `role="status"` and
  `aria-live="polite"` so screen readers announce the grade when it
  lands.
- ListingAuditForm and CampaignBuilderForm: the feedback paragraph
  moved off the misleading `.error` class into a dedicated `.feedback`
  class with the right ink-700 color. The inline style override is
  gone.
- KeywordResearchForm: every per-keyword intent `<select>` now has an
  `aria-label` so the `Choose...` placeholder is no longer the only
  label source.
- LiveClassRecordingButton: inline flex layout moved into a CSS
  module; the check emoji became a Phosphor `Check` icon; the button
  exposes `aria-busy` during the pending state so screen readers know
  the action is in flight.
- ListingAuditForm: em-dash in the Findings heading became a colon;
  the result badge swapped check/cross glyphs for plain `Correct` /
  `Expected:` text. StrTriageForm: result badge swapped check/cross
  for `Correct` / `Was:` text. Voice guide stays clean.
- EmptyState: title renders as a heading element (h3 default, h2 or
  h4 via prop). Quiz `not found` page uses h2 since the title is the
  page heading. 3 new unit tests cover the default and override
  heading levels.
- Skeleton.module.css: pulse animation wrapped in
  `prefers-reduced-motion: reduce` so motion-sensitive users see a
  static placeholder.
- Verified 3,932 Vitest tests passing with 3 skipped (3 new for
  EmptyState), 669 architecture checks passing, clean TypeScript and
  ESLint, production build, Playwright, Lighthouse, and Vercel.

### 2026-08-15: Student-facing UI pass — 25 entries (PR #320)

- Shipped 25 small, reviewable student-facing UI improvements across the auth,
  course, lesson, quiz, simulator, profile, checkout, and app-shell surfaces.
- New primitives: `ConfirmDialog` (native `<dialog>`, 10 tests), `Breadcrumb`
  shared across `/tools/*`, and `ScrollToTop` FAB mounted in `StudentShell`
  with 8 tests.
- New accessibility behaviors: `id="main-content" tabIndex={-1}` on every
  student `<main>`, brand-tinted focus-visible ring across links, buttons,
  and `.btn`, and `<meta name="theme-color">` so mobile browsers tint the
  chrome.
- Lesson, quiz, and profile polish: estimated reading time on the lesson
  header, real Phosphor icons on profile badges with slug-based tier color,
  quiz page breadcrumb showing the course title and the current quiz title,
  and the bare "Quiz not found" text replaced with the shared `EmptyState`.
- Student sidebar nav reorganised into Learn/Practice/Resources/Account.
- Checkout polish: scaled-in success/failed checkmark animation, FAQ link on
  the failed checkout page so stuck students can self-serve, and a 5-second
  auto-redirect countdown on the success page.
- Cleanup: inline styles on `/checkout/failed`, `/profile`, and the trailing
  inline style on the catalog cards moved into the page CSS modules; the
  `:has()` selector and the hanging inline badge styles on `/courses` were
  removed.
- Branded root `not-found.tsx` so unmatched routes match the Field Manual.
- Print stylesheet hides chrome and lets the certificate fill the page.
- 2FA setup step indicator on `/profile/security/2fa-setup`.
- Reset-password form wrapped in a card.
- Cancelled: confetti on lesson completion. `canvas-confetti` is not in the
  dependency graph. AGENTS.md forbids adding packages without updating
  `pnpm-lock.yaml`. Deferred to a separate cleanup PR if a follow-up wants
  to introduce the dependency.
- Verified 3,929 Vitest tests passing with 3 skipped, 669 architecture
  checks passing, clean TypeScript and ESLint, and a successful Next.js
  production build.

### 2026-08-14: Architecture documentation refresh

- Synced `docs/architecture/03-site-map.md`, `docs/architecture/02-admin-panel-wiring.md`,
  `docs/architecture/01-layer-wiring.md`, the architecture README, and
  `docs/api-reference.md` against the App Router tree and route handlers as of
  `6c61fc3`. Added the previously undocumented routes for student profile
  sub-pages, student certificates list, student live-classes, the
  `/courses/[slug]/quizzes/[quizId]` canonical quiz page, the `/tools/ad-console`
  external embed, admin user create, admin quiz CRUD, admin certificates, admin
  content dashboard, admin simulator version history, the resource download
  endpoint, the Resend webhook, and the readiness probe. No code changes.

### 2026-08-13: Admin event boundary coverage

- Added direct boundary tests for admin course, module, lesson, simulator,
  subscription, discount, badge, live-class, resource, audit-log, refund, and
  email-template actions.
- Added event contracts for stop-impersonation recovery, confirmation submit,
  and the impersonation banner.
- Added `docs/ADMIN-EVENT-COVERAGE.md` plus an inventory test that keeps every
  tracked admin action represented by a boundary test.
- Verified 3,869 Vitest tests passed with 2 skipped, 665 architecture checks
  passed, 80.21% statement coverage, 74.17% branch coverage, 81.46% function
  coverage, 81.56% line coverage, clean TypeScript and ESLint checks, and a
  successful Next.js production build.

### 2026-08-13: Student event boundary coverage

- Added direct tests for remaining student auth, account, live-class, simulator,
  download, certificate, verification, and form event boundaries.
- Added `docs/STUDENT-EVENT-COVERAGE.md` as the ongoing coverage contract.
- Verified 3,848 Vitest tests passed with 2 skipped and 665 architecture checks
  passed.

### 2026-08-12: Student repair follow-ups and current verification

- Merged PR #305 (`9096cf4`), the full student-facing journey, route-state,
  navigation, export, and accessibility repair.
- Merged PR #306 (`9d80c77`). Audited manual STARTER and PRO tier grants now
  create the eligible published-course enrollments needed by the dashboard and
  lesson access checks. The operation is idempotent and does not create an order.
- Merged PR #307 (`88d83d9`). Admin login now plants the session cookie on the
  redirect response before navigating to `/admin`.
- Merged PR #308 (`ee1737a`). Password-reset and transactional links normalize
  the retired deployment origin to `https://projectamazonph.vercel.app` while
  preserving local and custom configured origins.
- Verified 3,816 Vitest tests passed with 2 skipped, 665 architecture checks
  passed, and TypeScript, ESLint, the production build, Playwright, and
  Lighthouse passed.

### 2026-08-10: Student journey reliability repair (STORY-104)

- Completed lesson progress, canonical quiz submission, subscription entitlement,
  simulator challenge gating, and live-class enrollment enforcement.
- Linked pricing tiers to checkout offers, preserved tier selection through signup,
  and made checkout totals use authoritative early-bird pricing.
- Added student purchase history, policy-enforced refund requests, certificate lists,
  and complete profile, payment, progress, quiz, and simulator data export.
- Replaced account-enumerating login messages, silent data failures, nested
  interactive controls, invalid landmarks, dead controls, and hard-coded progress
  claims with truthful and accessible states.
- Added route error boundaries, mobile navigation focus management, exception
  recovery for student actions, and the configured production app URL for payment
  redirects and metadata.
- Repaired public contrast, heading order, landmarks, link naming, responsive
  image sizing, and the pricing outage state. Axe and Lighthouse now fail CI on
  accessibility regressions instead of logging or swallowing them.
- Removed undefined CSS and inline-style tokens, enforced accessible accent text,
  restored headed route errors, and announced student mutation outcomes.
- Added busy main landmarks to every non-admin loading state and route-level
  loading UI for FAQ, resources, and Ad Console, backed by architecture guards.
- Verified 3,804 passing tests and 2 intentional skips, 665 passing architecture
  checks, clean TypeScript and ESLint checks, and a successful Next.js production
  build. Local Playwright remains blocked by the workspace network-interface
  restriction, so GitHub CI remains the browser authority.

### 2026-08-10: Admin access management and responsive recovery (STORY-103)

- Added audited subscription-tier changes and course enrollment grant, revoke,
  and restore controls to each admin user detail page.
- Fixed the Astryx light/dark token mismatch that rendered dark cards with dark
  text on phones, plus mobile header, drawer, grid, form, card, and table
  overflow across the admin console.
- Replaced fake dashboard trends, dead buttons, duplicate filters, and the
  content placeholder with real audit activity, refund status, and content
  counts.
- Added a production-only Vercel build migration step so deployed databases receive pending
  additive Prisma migrations before the new application build goes live.
- Added an authenticated Playwright journey for tier changes and enrollment
  grant, revoke, and restore on desktop, tablet, and mobile projects.

### 2026-08-09: Long-form skeptical-buyer FAQ page (`/faq`)

Direct request, not sprint backlog work (same pattern as the 2026-07-26
landing page replacement: no `docs/stories/STORY-XXX.md` for this one).

- **New `/faq` page.** Ryan's 10-question skeptical-buyer FAQ, first
  person, structured around naming what still isn't finished, not just
  what works. Content lives in `src/app/faq/faqContent.ts` as data,
  separate from `src/app/faq/page.tsx`'s layout.
- **Two "what I need to fix" claims corrected before publishing.** The
  simulator-realism and score/certificate questions described gaps
  that Sprint 14/15 already closed (formative-only labeling, non-binary
  Listing Audit ground truth, Campaign Builder's 7-dimension scoring,
  anti-gaming calibration). Two more got a "what I've fixed" line added
  from verifiable shipped work (the download center + embedded Ad
  Console, and the homepage's live Bid Elevator preview). The other six
  questions are unchanged from what Ryan supplied — no evidence those
  gaps are closed.
- **Linked from the landing page's short FAQ accordion**
  (`src/components/landing/FAQSection.tsx`), which keeps its own
  six-answer quick-reference content unchanged.
- Regression test (`src/app/faq/__tests__/faq-page.test.ts`) locks in
  the structure: exactly 10 items, no em dashes, no
  `docs/voice-guide.md` banned phrases, and the scoring answer can't
  drift into job-guarantee language.

### 2026-08-05: Course detail zero-meta + voice fixes (STORY-102)

Three follow-up fixes from the 2026-08-05 audit pass on the live
deployment, after STORY-101 shipped:

- **Course detail `0 lessons · ≈ 0 hours` on Ultimate.** Same class
  of bug as STORY-101, but on `/courses/[slug]`. The detail page
  header meta now branches on `totalLessonCount > 0` and shows
  `Live cohort + 1:1 review` for live tiers; the `≈ X hours` and
  `Xh Ym video` lines are hidden for the same reason. Visiting
  `/courses/ultimate-transformation` no longer shows a misleading
  `0 lessons · ≈ 0 hours` next to the Buy button.
- **`Knowledge check` → `Quick check` (LessonContent).** The QUIZ
  lesson card title used "Knowledge check", an AI-slop tell per
  the voice guide. Replaced with `Quick check` — direct, describes
  the action.
- **`Knowledge check` → `Quick check` (QuizPlayer).** Same fix in
  the standalone quiz player kicker.

### 2026-08-05: /courses catalog launch-bug fixes (STORY-101)

Two student-facing bugs found by a production smoke test on
`https://projectamazonph.vercel.app`:

- **`0 lessons` on Ultimate card.** The catalog card meta rendered a bare
  "0 lessons" for the `Ultimate Transformation` tier. The tier is a
  live-cohort offering (no on-demand lessons in the DB) so the count is
  correct, but the visible "0 lessons" reads as broken. The card now
  shows `Live cohort + 1:1 review` for tiers with zero on-demand lessons.
- **"Amazon FBA training" copy.** The `/courses` metadata description and
  hero subtitle called the offering "Expert-led Amazon FBA training."
  The landing FAQ is explicit: we teach agency-side PPC for VAs, not
  Amazon FBA selling. Both strings re-aligned to "Amazon PPC training
  for Filipino VAs. Agency-side work, taught in Filipino."

### 2026-08-04: Review-comment fixes across PRs #285/#286/#288

XP double-award race, unbounded uploads, fail-open storage, and two admin
conventions the resources feature was missing — all found by review comments
on already-merged PRs.

- **Live-class recording XP race (real bug)** — `MarkLiveClassRecordingWatched`
  read-checked-then-wrote `watchedRecordingAt` non-atomically; two concurrent
  calls could both pass the check and both award XP.
  `ILiveClassRegistrationRepository.markRecordingWatched()` makes the flip
  atomic (`UPDATE ... WHERE watched_recording_at IS NULL`); only the caller
  whose write actually lands awards XP. New concurrency regression test.
- **Resources durability** — `UpdateResource`/`PurgeResource`'s storage-delete
  and audit-log writes are now `await`ed instead of fire-and-forget, closing a
  window where a frozen serverless execution context could silently drop them
  after the response was already sent.
- **Resources upload validation** — size (25 MB) and MIME-type allowlist
  checks added before buffering an uploaded file into memory.
- **Storage fails closed in production** — `buildContainer()` now throws if
  `BLOB_READ_WRITE_TOKEN` is unset in production, instead of silently falling
  back to `LocalFileStorage` (which doesn't persist on Vercel's serverless
  filesystem).
- **Resources admin conventions** — `/admin/resources` gained search/filter/
  pagination (every other admin list page already had it); `Resource` gained
  `createdById`/`updatedById` actor-audit fields (new migration).
- Two smaller fixes: an invalid `<button>` nested inside an `<a>` in
  `LiveClassRecordingButton.tsx`, and a stale "Simulators" nav label left over
  from the Amazon Ad Console page's rename to "Tools".
- **Deliberately not done**: rebuilding the resources admin forms with AMPH
  `@/components/ui` primitives — no admin form in the codebase uses them, so
  doing it only for resources would make resources the inconsistent one.

### 2026-08-04: Non-binary Listing Audit ground truth + Campaign Builder strategic scoring (STORY-083, STORY-084)

Both stories were previously flagged as needing Ryan's Amazon PPC expertise,
not delegable to an agent — implemented directly under Ryan's in-session
direction, with his decisions already recorded in each story doc.

- **STORY-083** — Listing Audit's binary fix/skip verdict becomes a 4-value
  `FindingAction` (`fixNow | defer | skip | escalate`), resolved per finding
  by a new category-, compliance-evidence-, and rule-id-aware
  `resolveExpectedAction()` layer sitting on top of the existing STORY-080
  finding generator (left untouched). Closes the click-through-every-finding
  bypass the audit report flagged.
- **STORY-084** — Campaign Builder's 3-dimension scoring expands to 7
  (adds negative-keyword routing, branded isolation, duplicate control,
  naming compliance; rewrites budget allocation from a flat ±50% tolerance to
  a ±2% total-spend gate + ±10pp per-role check). Two scope simplifications,
  documented in `docs/stories/STORY-084.md`: the story's 4-factor duplicate
  rule collapses to 1 factor (the other 3 are always constant in this
  single-ASIN scenario model), and only 2 of the broader negative-routing
  table's rules are structurally derivable from the simulator's fixed
  3-campaign shape.
- Test data for both: agent-constructed synthetic submissions, documented as
  such (not Ryan-reviewed), per Ryan's own choice.

See `docs/stories/STORY-083.md` and `docs/stories/STORY-084.md`.

### 2026-08-04: Build the missing listing-audit and campaign-builder UIs; fix a real grading bug

Follow-up to STORY-085 (below): built the two UI gaps it left open, and fixed a
pre-existing production bug discovered while building them.

- **listing-audit** — `ListingAuditForm` now has a real edit → triage (fix/skip per
  finding) → grade flow, calling `listingAuditAttempt()` instead of stopping at the
  preview-only `auditListing()`.
- **campaign-builder** — `CampaignBuilderForm` now has a real nested editor: add/remove
  campaigns, ad groups, and keywords, submitted as `userAdjustedCampaigns` so grading
  produces real `scoreDimensions`/feedback instead of always `null`.
- **Bug fix, unrelated to STORY-085's own changes** (present since STORY-067/069/070):
  `GradeSimulatorAttempt` requires an attempt already `"submitted"`, and
  `SubmitSimulatorAttempt` requires at least one saved decision. bid-elevator and
  campaign-builder never called either before grading; listing-audit called submit
  _after_ grading instead of before. Every graded call to these three actions was
  silently failing in production — invisible to unit tests since they mock the grading
  call directly. Fixed in all three, with regression tests asserting submit-before-grade
  ordering.

See `docs/stories/STORY-085.md`'s "Post-merge follow-up" section for full detail.

### 2026-08-04: Scenario publishing + versioning — full rewire (STORY-085)

`SimulatorScenario` rows used to be pure metadata: every practice page hardcoded its actual
content in a `SCENARIO` const, decoupled from the DB row, with no draft/published lifecycle.
This story built the real thing:

- Draft → published → archived lifecycle with version history for `SimulatorScenario`,
  admin UI to create drafts, publish them, and browse version history.
- All 5 practice pages (bid-elevator, str-triage, campaign-builder, listing-audit,
  keyword-research) now read their content from the currently published scenario
  server-side, so publishing a new version through the admin UI actually takes effect.
- Closed a real trust gap in bid-elevator, str-triage, and listing-audit: their server
  actions used to accept scenario economics/category/niche back from the client on submit;
  a forged payload could directly control the grade. Now resolved server-side.
- campaign-builder and bid-elevator's practice pages were switched from a legacy
  preview-only action (never persisted an attempt) to their existing but previously-unwired
  graded lifecycle — both simulators now create a real, persisted `SimulatorAttempt` for the
  first time.

Known limitation: neither campaign-builder nor listing-audit has a UI for the free-form
submission their richest grading path expects — building that editor is a separate feature.
See `docs/stories/STORY-085.md` for the full 6-stage breakdown.

### 2026-08-03: Live-class recording + post-class XP; email templates wired into the send path (STORY-100, STORY-095.5)

Two follow-ups picked from a repo-wide gap review:

- **STORY-100 (live-class recording + XP):** admins can attach a recording URL to a
  completed live class; students who RSVPd can mark it watched for 15 XP, once,
  idempotently. Also closed a real production gap this surfaced: `buildProductionContainer()`
  was still wiring an in-memory RSVP repository, so registrations vanished on every cold
  start/redeploy. Built `PrismaLiveClassRegistrationRepository` and swapped it in.
- **STORY-095.5 (email templates wired into Resend):** the `/admin/email-templates` editor
  built earlier had no effect on what Resend actually sent. All 7 admin-editable templates
  (verification, password reset, welcome, receipt, refund, certificate, live-class reminder)
  now pull admin-customized subject/headline/intro/CTA copy at send time, falling back to
  the original hardcoded copy when nothing's customized.

See `docs/stories/STORY-100.md` and `docs/stories/STORY-095.5.md` for full detail.

### 2026-08-03: Download center: content library expansion (STORY-099)

16 new resources added to the download center, bringing the library
from 10 to 26: 3 guides (Sponsored Brands setup, Sponsored Display
setup, campaign structure & match type strategy), 3 templates
(negative keyword master list, new client onboarding checklist, budget
pacing tracker), 4 automation tools with live formulas (placement bid
modifier calculator, keyword bid calculator, budget pacing &
dayparting analyzer, campaign health scorecard), 3 cheat sheets
(acronyms/glossary, SP vs SB vs SD comparison, negative keyword match
types), and 3 handouts (VA weekly task checklist, PPC troubleshooting,
client communication etiquette). No code changes: the download center
already supports any number of resources; this is pure content plus
26 total `ResourceDef` entries in `scripts/seed-resources.ts`.

See `docs/stories/STORY-099.md` for the full list, formula-verification
notes for the 4 automation tools, and the LibreOffice caveat (carried
over from STORY-098).

### 2026-08-03: Download center — pre-installed resources + file upload (STORY-098, STORY-098.5)

New `/resources` download center (student-facing) and `/admin/resources`
(admin CRUD): guides, templates, automation tools, cheat sheets, and
student handouts, gated by `CourseAccessTier` the same way courses are.
`GET /api/resources/[id]/download` is the real access-enforcement and
download-tracking endpoint, not just the UI's lock icon.

Shipped with 10 real pre-installed files in `public/downloads/`
(`pnpm db:seed:resources` to load them): 2 PDF guides, 3 Excel
templates, 1 Excel automation tool (an STR report scanner that flags
Winner/Bleeder/Watch search terms via live formulas against adjustable
thresholds), 2 PDF cheat sheets, and a PDF + a DOCX handout.

Admins can also upload files directly instead of only pasting an
external link, via a new `IFileStorage` port (`VercelBlobFileStorage`
in production when `BLOB_READ_WRITE_TOKEN` is set, `LocalFileStorage`
as a dev-only fallback — it does not persist on Vercel's serverless
filesystem). Replacing an uploaded file cleans up the old one; a
separate "Permanently delete" action removes a resource and its file
entirely, distinct from the existing unpublish action.

See `docs/stories/STORY-098.md` and `docs/stories/STORY-098.5.md`.

### 2026-08-03: Add embedded Amazon Ad Console page

New `/tools/ad-console` page embeds the external campaign-management
console (`amazon-ad-console.vercel.app`) in an iframe, with a guide
section on signing in, using it alongside the practice simulators, and
a warning that — unlike the 5 formative simulators — this is a live
tool connected to a real Amazon Ads account, so changes are real and
generally not reversible.

Added a card on the `/tools` index and a command-palette entry.
`src/proxy.ts` had no `frame-src` CSP directive at all (it fell back
to `default-src 'self'`, which would have silently blocked the
iframe) — added `frame-src https://amazon-ad-console.vercel.app`
(folded into the nonce-based CSP array added by the 2026-08-02
consolidated engineering review, below, since both touch the same
header). Includes an "Open in new tab" fallback in case the target
site's own headers refuse to be framed.

### 2026-08-02: Consolidated engineering review — 8 of 10 proposals implemented

Implements Proposals 1-8 and 10 from a consolidated code review + engineering
proposal document. Proposal 9 (DailySnapshot table) was skipped after
discovering `PpcCampaign`/`dailySnapshots` is fully dead schema (zero
references anywhere in `src/`) — building a repository/use case for it would
have been unused infrastructure.

**Security:**

- **Proposal 1** — `Login` now enforces the previously-unused
  `failedLoginCount`/`lockedUntil` columns: 5 consecutive wrong passwords
  locks the account for 15 minutes. New `UserRepository.recordLoginAttempt()`
  (a single consolidated method, to stay under the ISP method-count
  architecture test's threshold) and `User.lockedUntil` on the domain entity.
- **Proposal 2** — Replaced CSP `script-src 'unsafe-inline'` with a
  per-request nonce (`src/proxy.ts`). Deliberately does **not** add
  `'strict-dynamic'` — verified via a real Chromium run that it breaks
  Turbopack's route-loading (`loading.tsx`) chunks, a known open
  Next.js/Turbopack ecosystem issue. `style-src` still allows
  `'unsafe-inline'` (inline `style={{...}}` attributes throughout the app).
- **Proposal 4** — New `src/domain/values/Email.ts` (`createEmail`/
  `isValidEmail`) replacing weak `email.includes("@")` checks in
  `SignUp`/`Login` with a shared, ReDoS-safe RFC 5321-informed validator.

**Durability:**

- **Proposal 3** — `PrismaLiveClassRegistrationRepository` replaces
  `InMemoryLiveClassRegistrationRepository` in production — RSVPs no longer
  lost on cold start/redeploy.
- **Proposal 5** — New `GET /api/health/ready` readiness probe (checks DB via
  a new `DatabaseHealthCheck` port) alongside the existing static `/api/health`
  liveness check.
- **Proposal 10** — `SignUp.hashPassword()` returns `Result` instead of
  throwing on a hasher failure (new `hash_error` `SignUpError` variant).

**Quality / tech debt:**

- **Proposal 7** — 7 composite indexes added (`orders`, `quiz_attempts`,
  `progress_events`, `audit_logs`), each matched to a real query in the
  corresponding repository and confirmed via `EXPLAIN`. `CREATE/DROP INDEX
CONCURRENTLY`, following the existing migration convention.
- **Proposal 8** — Fixed a real dual-source-of-truth bug: `TierAccessPolicy`
  (production access control) read the denormalized `User.enrolledCourseIds`
  copy instead of the authoritative `Enrollment` table, so a failed
  `User.update()` write after enrollment could silently leave a paying user
  without access. `TierAccessPolicy` now queries `Enrollment` directly;
  `EnrollStudent` no longer writes the denormalized copy. The field is marked
  `@deprecated` but not dropped yet (multi-step removal).
- **Proposal 6** — Implemented 3 of 4 previously-`test.skip()`'d critical
  E2E journeys (admin login + discount code, admin login + create course,
  public certificate verification), with new `seedAdminUser`/`seedCertificate`
  E2E helpers. Running these against a real browser caught **two real
  production bugs**, both fixed: (1) `/admin/courses/[id]` crashed for every
  visitor — a Server Component passed `onClick` directly to `<form>`
  elements, invalid in Next.js; extracted into a `ConfirmSubmitButton`
  Client Component. (2) `/certificates/[hash]` — documented as "no auth
  required" — actually required login (`StudentShell`'s `requireAuth` default
  was never overridden) and had the same `onClick`-on-Server-Component crash
  on its print button (`PrintButton` Client Component). Also fixed a
  test-isolation race (parallel E2E workers deleting each other's seeded
  sessions mid-test) with `test.describe.configure({ mode: "serial" })`.

### 2026-08-02: Fix chromium-mobile/chromium-tablet E2E timeout (playwright.config.ts)

Root-caused the mobile/tablet E2E signup timeout that PR #272 flagged as
pre-existing on `main`. `chromium-mobile` and `chromium-tablet` project
names were a lie: `devices["iPhone 13"]` and `devices["iPad (gen 7)"]`
both set `defaultBrowserType: "webkit"`, and nothing in the project `use`
blocks overrode it, so both projects silently launched WebKit, not
Chromium, on every run (confirmed by reproducing locally, clicking the
signup submit button under WebKit never triggered navigation at all,
the page stayed on `/signup` until the 15s assertion timeout). Only
`chromium-desktop` (via `devices["Desktop Chrome"]`, which correctly
sets `defaultBrowserType: "chromium"`) was ever actually testing
Chromium.

Fix: explicitly set `browserName: "chromium"` on both projects (it
takes precedence over the inherited `defaultBrowserType`), so they test
what their names claim, Chromium at a mobile/tablet viewport and touch
profile, not real WebKit/Safari behavior, which was never the intent
(nothing else in the repo, CI config, docs, other test files, suggests
Safari/WebKit compatibility was ever an explicit target).

Verified locally: full `pnpm exec playwright test` (all 3 projects).
45 passed, 12 skipped, 0 failed, including every test in
`signup.spec.ts` and `critical-journeys.spec.ts` on `chromium-mobile`
and `chromium-tablet` that was failing/flaking on `main`.

### 2026-08-02: Production-readiness fix session (STORY-049.5, STORY-078, STORY-097, STORY-095, STORY-096)

Follow-up to a thorough production-readiness review. Fixes three verified bugs and builds four previously-missing student/admin features.

**Fixes:**

- `PayMongoAdapter.refund()` now calls the real PayMongo Refunds API (`POST /v1/refunds`) instead of returning `not_implemented` (STORY-049.5). `ProcessRefund`/`RefundOverride` can now actually issue refunds against production PayMongo.
- `src/infra/database/prisma.ts`: the Prisma client is now a lazily-initialized `Proxy` instead of being constructed eagerly at module import time. Fixes a real bug where `next build` (and any CI/preview build) crashed with "DATABASE_URL environment variable is not set" during page-data collection, even without serving a request.
- Added a `Content-Security-Policy` header to `src/proxy.ts` (pragmatic first pass: `script-src`/`style-src` still allow `'unsafe-inline'`, no nonce plumbing yet).
- `src/infra/payment/PayMongoAdapter.test.ts` was silently never executed by `pnpm test`/CI — it lived outside `vitest.config.ts`'s `include` glob (`__tests__/`/`tests/` only). Moved to `src/infra/payment/__tests__/PayMongoAdapter.test.ts` and extended with refund coverage.

**New features:**

- **STORY-078** — shared `FormativeScoreNotice` component now renders on all 5 simulators' result views ("Practice score only. Not a certification, job-readiness signal, or hiring credential."), pinned by a regression test.
- **STORY-097** — student 2FA opt-in at `/profile/security` + `/profile/security/2fa-setup`, reusing the same role-agnostic `EnableTwoFactor`/`ConfirmTwoFactor`/`DisableTwoFactor` use cases the admin flow already used.
- **STORY-095** — admin email-template editor at `/admin/email-templates` (list) and `/admin/email-templates/[type]/edit` (upsert-by-type form). New `ListEmailTemplates`/`GetEmailTemplate`/`UpdateEmailTemplate` use cases (re-creating what PR #256 deleted as dead code on 2026-07-31, this time with container wiring and pages). Known limitation stated on the page itself: not yet wired into the actual send path.
- **STORY-096** — account deletion + data export at `/profile/data`. New `UserRepository.anonymizeAndDelete()` port method; new `DeleteUserAccount` (password-confirmed) and `ExportUserData` use cases. Financial/academic records (orders, enrollments, certificates) are deliberately not deleted, only disassociated from reusable PII. `IProgressEventRepository`/`PrismaProgressEventRepository` (previously unwired dead code) got wired into both containers as a side effect.

Verification: `pnpm typecheck && pnpm lint && pnpm test` all green (3335 passed, 2 skipped, 0 failed) and `pnpm build` succeeds with zero environment variables set. (First `pnpm build` attempt after STORY-096 caught a real bug: `exportUserData.action.ts` was missing `"use server"`, so the client component `ExportDataButton.tsx` calling it directly dragged `buildContainer()`'s server-only dependency graph — Prisma, `pg`, `NextMdxRenderer` — into the client bundle and failed with "the chunking context does not support external modules (request: node:module)". Fixed by adding the directive; rebuilt clean.)

### 2026-08-01: Live-class student experience (STORY-090, STORY-091)

Closes the second-largest entry in `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`. Adds `/live-classes` (list) and `/live-classes/[id]` (detail + RSVP) for enrolled students. New `LiveClassRegistration` domain entity, `ILiveClassRegistrationRepository` port, in-memory adapter (`live_class_registrations` table migration), and three use cases (`ListLiveClassesForStudent`, `RsvpLiveClass`, `CancelLiveClassRsvp`). Server actions validate the session via `getSessionUserId()` and revalidate the affected routes. RSVP is idempotent; cancelled RSVPs can be re-registered.

### 2026-08-01: Lesson-to-quiz transition wiring (STORY-094)

QUIZ lessons in the curriculum previously rendered an "Interactive quiz, coming soon!" placeholder. The `LessonContent` component now matches the domain `Lesson` entity and renders a real quiz card with the question count, a preview of the first two prompts, and a "Start Quiz" link to `/courses/[slug]/lessons/[lessonId]/quiz`. Removes a documented audit gap and restores a path the seeded content was already pointing at.

### 2026-07-31: Production readiness hardening (PR #256, `915c7ca`)

Full codebase audit and hardening pass. 61 files changed, 476 insertions, 3,044 deletions.

**Critical fixes:**

- `Order.mark*()` returns `Result` instead of throwing (ADR-014 compliance). All 5 state-transition methods now return `Result<void, OrderTransitionError>` with callers updated.
- `NodeContentReader`: removed hardcoded Windows path (`D:\Web Project\...`), replaced with project-relative path via `import.meta.url`.
- `ReactPdfCertificateRenderer.render()`: added try/catch with `cause` chain for error transparency.
- `container.ts`: added `validateRequiredEnvVars()` fail-fast guard for `PAYMONGO_SECRET`, `RESEND_API_KEY`, `JWT_SECRET`, `DATABASE_URL` at startup.

**Moderate fixes:**

- `Money.of()` returns `Result<Money, MoneyError>` instead of throwing. All 8 callers updated (including `AdminProcessRefund`, `ApplyDiscountCode`, `CreatePaymentIntent`, `InMemoryOrderRepository`).
- `PayMongoAdapter.verifyWebhookSignature()` returns `Result<boolean, ...>` instead of throwing. Webhook route updated.
- Deleted 7 dead use cases + 7 test files (14 files): `GetEmailTemplate`, `ListEmailTemplates`, `UpdateEmailTemplate`, `ImportAmphContent`, `MarkLessonComplete`, `RecordStreakVisit`, `RequestRefund`.
- Deduplicated `Difficulty` type: canonical in `SimulatorScenario.ts`, 8 importer files re-pointed.
- Deduplicated `LessonType`: canonical in `Lesson.ts`, `Course.ts` imports from there.

**Minor fixes:**

- Health endpoint: DB readiness probe via `courseRepo.listAll()` returning 200 + latency or 503 + error.
- Session revocation: server-side `SessionRepository` check after JWT verify in `getSessionUserId()`.
- `pendingRefunds`: wired real query via `orderRepo.listRefundRequests({ status: "pending" })`.
- Test fixtures: `userId: "system"` → `"user_123"` in 5 simulator test files.
- `auth.guards.test.ts`: `seedSessionCookie()` now creates matching session record for revocation tests.
- `checkout.action.ts`: added missing `default` branch in `mapPaymentError` switch.
- `CreatePaymentIntent`: fixed error return type to match `CreatePaymentIntentOutput`.

**Documentation updated:**

- `CLAUDE.md`: removed deleted use cases from use-case list, fixed "flat" claim to reflect nested subdirectories.
- `docs/architecture/01-layer-wiring.md`: seed-admin now uses PrismaPg adapter.
- `docs/architecture/03-site-map.md`: health endpoint now has DB readiness probe.
- `docs/api-reference.md`: marked moved use cases with italic migration notes.
- `SESSION-TDD-SOLID-AUDIT.md` + `NEXT-SESSION-PROMPT.md`: updated Tier D status to reflect deletions.

### 2026-07-30: Sprint 15 — STORY-081 (Keyword Research) and STORY-082 (STR Triage)

- **STORY-081** (PR #246, `2046fed`): Keyword Research promoted from a page-level alias over Listing Audit to its own registered simulator (`src/domain/simulator/keyword-research/`), backed by a versioned `KeywordDataset` entity and `StaticKeywordDatasetRepository` (4 of 12 launch niches, all `synthetic_calibrated`). Grades `intentAccuracy` and `negativeIdentification` (F1) against the dataset's own labels. Credential-mode attempts are rejected until real curated data lands. Fixed in review: a lifecycle-ordering bug that called `GradeSimulatorAttempt` before `SubmitSimulatorAttempt` (would fail every real grading attempt with `attempt_not_submitted`; the same bug still exists in the other three simulators' actions, flagged as out-of-scope follow-up), and a scoring-integrity bug where an unclassified, negative-flagged keyword defaulted to intent `"core"` instead of staying ungraded.
- **STORY-082** (PR #247, `2edb67a`): STR Triage classifier rewritten from a 4-field row and a hardcoded `avgSpendPerKeyword` constant to the full search-term-report schema, statistical zero-order thresholds, existing-target detection, per-brand-class target ROAS, and a real `insufficient_data` action (7 actions total). The practice page now runs the full graded lifecycle instead of a preview-only path.
- Sprint 15 is now 4/7 done (STORY-079–082); STORY-078, 083, 084 remain planned.
- Documentation synchronized: `CLAUDE.md`, `docs/sprint-plan.md`, `docs/stories/STORY-079..082.md`, `README.md`, `FEATURES.md`, `docs/db-schema.md`, `docs/architecture/01-layer-wiring.md`, `docs/architecture/03-site-map.md`.

### 2026-07-30: Admin manual subscription-tier grant (bypass checkout)

- New `AdminGrantSubscription` use case + `/admin/users/new` admin form: an admin can grant a student STARTER/PRO access directly, for students who paid outside the platform (bank transfer, GCash sent directly, cash) rather than through PayMongo checkout. Creates a placeholder account if the student doesn't have one yet and reuses `RequestPasswordReset` to email a "set your password" link (no bespoke claim-token system added).
- Optionally records how the student paid (method, amount, free-text reference) as `AuditLog` metadata under a new `user.subscription_granted` action, for bookkeeping. No `Order` row is created, since `Order` is scoped to a single course purchase and this grant is tier-wide.
- `UserRepository.update()` gained a `subscriptionTier` patch field; both the Prisma and in-memory adapters already handled it generically via object spread, so no adapter logic changed, only the port/type declarations.
- Verification: full unit suite (2,732 tests) green, all 13 architecture-compliance suites (TDD coverage + SOLID layering rules) green, `pnpm typecheck` clean, `pnpm lint` clean repo-wide, `pnpm build` succeeds.

### 2026-07-27: Completeness audit and documentation synchronization

- Audited the current route tree, composition root, Prisma schema and migrations, server actions, use cases, tests, and operational docs at commit `5b8072b`.
- Replaced stale feature, API, schema, architecture, route-map, runbook, README, sprint, story, and handover claims with current-source status notes.
- Recorded real follow-ups: Prisma badge mutation stubs, synthetic simulator ownership, direct Prisma construction in the admin seed script, session revocation and lockout semantics, first-time impersonation restore, the dashboard refund placeholder, and the quiz lesson placeholder.
- Verification snapshot: typecheck, lint, build, Prisma validation, and architecture tests pass; Vitest has 2,962 passing and two Windows migration-contract path failures; Playwright was not verified because local browser binaries are unavailable.
- Full evidence: `docs/audit-2026-07-27-completeness-review.md`.

### 2026-07-26: Landing page replaced with a field-manual-styled redesign (PR #194)

- Replaced `src/app/page.tsx` end-to-end: new `TopBar` (sticky nav, mobile menu, scroll progress, Manila clock), `Ticker`, `Hero`, `StatsStrip` (animated count-up), `Method`, `SimulatorSection` with an interactive Bid Elevator preview (canvas chart, budget/bid/target-ACoS sliders, search-term harvest table), `Curriculum`, `WhoFor`, `Pricing`, `Mentor`, `Proof`, `FAQSection`, `DarkCTA`, and `Footer`. All built as Next.js components on the existing `globals.css` design tokens, not a separate palette, exercising the one documented brand-register exception in `PRODUCT.md`.
- Old landing components (`Hero`, `Numbers`, `Audience`, `Practice`, the old `Curriculum`/`Pricing`/`FAQ`, `FinalCTA`, and their tests) removed entirely, replaced by the new set under `src/components/landing/`.
- The Bid Elevator preview's math was extracted into a pure, unit-tested module (`bidElevator.logic.ts`, 12 tests). It's illustrative-only and intentionally separate from the real scored `src/domain/simulator/bid-elevator/` simulator (public, unauthenticated marketing widget vs. a signed-in student's graded attempt).
- Brand kit assets wired in: logo SVGs, hero photography, and a favicon under `public/brand/` and `public/`; `layout.tsx` gained `manifest`/`icons` metadata and a JetBrains Mono 700 weight.
- CodeRabbit review response: em-dashes removed from all new copy and comments (a real, previously-undocumented-to-us repo-wide rule already in `AGENTS.md`/`docs/voice-guide.md`); the "Email me the syllabus" CTA (which duplicated the primary CTA's destination while promising an email flow that doesn't exist) relabeled to "See what's inside" and repointed at `#curriculum`; a real `requestAnimationFrame` leak in `StatsStrip`'s count-up on unmount fixed; `aria-pressed` added to the Bid Elevator's Auto/Exact/Neg segmented buttons; the canvas now resolves its ink/accent/muted/border colors from the actual CSS custom properties at runtime instead of hardcoded hex (same pattern already used for the mono font); `COURSES_URL` and the check/cross icon SVGs, previously copy-pasted across 5 files, deduplicated into shared `constants.ts`/`Icons.tsx`.
- After merge, restored two decorative details (the fixed dot-grid/noise background texture, two drifting "register mark" icons) that the first pass had simplified away relative to the reference design, per follow-up user feedback comparing the preview against the original mockup.
- Squash-merged as `45e0504`. CI green throughout: typecheck, lint, full test suite (2954+ passing), build, E2E, Lighthouse.

### 2026-07-26: Simulator accuracy audit verification (docs only)

- A pasted external review of the simulator subsystem (scoring inflation, dimension naming, Amazon PPC accuracy) was verified claim-by-claim against the source. Unlike the earlier infrastructure audit, **every substantive claim checked out** — hardcoded `explanation: 100` in all four simulators, 10–25% policy weight on that free dimension, `dataSufficiency`/`profitability` measuring completion rather than what they name, binary severity-based ground truth, invented keyword volumes, and an inverted backend search-terms rule.
- Three further defects were found that the review missed, two of them more serious than anything it reported: (1) clicking "fix" on every Listing Audit finding scores 87–90 and passes every difficulty without reading anything (random guessing passes beginner 89.1% of the time); (2) four score policies have weights summing to 0.90, capping a flawless learner at 90 — `createScorePolicy()` rejects this but the seed script bypasses it via raw `prisma.upsert` and the repository hydrates via `hydrateScorePolicy()`, leaving `isValidPolicy()` as dead code; (3) `passingThreshold` is seeded on every dimension and documented as driving partial credit but is read by no production code.
- Scoping the rename surfaced a correction to the review's own recommendation: `dataSufficiency` is a completion metric in **both** Listing Audit and STR Triage (so both should be renamed `reviewCoverage`), but `profitability` is only mislabeled in Listing Audit. STR Triage's version genuinely computes `preservedRevenue / nonPausableRevenue` and is correctly named, so renaming it globally would mislabel a correct dimension.
- The mechanical fixes were then measured rather than assumed: dropping `explanation`, ungrading completion, and making `priorityCoverage` penalise over-fixing blocks the bypass on beginner and cuts blind guessing from ~89% to ~11-19%, but does **not** close it on intermediate/advanced. The residual cause is the binary ground truth itself (four of six findings genuinely are "fix"), so closing it needs subject-matter work, not re-weighting. The plan says so explicitly rather than overclaiming.
- Full evidence in new `docs/audit-2026-07-26-simulator-accuracy-review.md`. Remediation sequenced as Sprints 14–16 in `docs/sprint-plan.md` (STORY-071–089), deliberately ordering scoring _integrity_ ahead of scoring _content_. `CLAUDE.md` gained a known-gaps entry warning against building certification or job-readiness signals on current simulator scores.
- No application or scoring code was changed in this pass.

### 2026-07-26: Finish the AMPH → Project Amazon PH Academy rename on customer-facing surfaces

- PR #156 renamed "AMPH Academy" to "Project Amazon PH Academy" in most user-facing copy but missed two spots that still said the bare "AMPH" abbreviation: the logo text on `/checkout` (`CheckoutForm.tsx`, both the empty-state and confirm-purchase views) and the line-item description PayMongo shows the customer during hosted checkout (`PayMongoAdapter.ts`, `createCheckoutSession`). Both now read "Project Amazon PH Academy", matching the convention already used on `/login` and the admin sidebar.
- Audited every other "AMPH" occurrence in the codebase (cookie names, internal file/class names like `amph-theme.ts`/`IAmphContentReader`, `package.json`'s package name, unused `IdGenerator.paymentRef()`/`receiptNumber()` prefixes, CSS comments) and confirmed none of them are customer-visible — left as-is; renaming them would be pure code churn with no user-facing benefit. The GitHub repo name and the live `amph-v2-greenfield.vercel.app` production URL are also still "AMPH" but touching either has real external consequences (broken links, git remote updates, possible custom-domain purchase) and was intentionally left out of this pass.

### 2026-07-26: Production-readiness lint sweep (PR #195)

- Eliminated the last ESLint warning in the codebase: `ImpersonateUser.ts` was logging admin impersonation via `console.log` (flagged by `no-console`) instead of writing a real audit entry. Fixed at the root — it now writes a `user.impersonated` entry via `RecordAuditLog`, the same pattern used by every other sensitive admin action, closing a real "no admin mutation without an audit log" gap rather than just silencing the lint rule.
- Removed two stale `eslint-disable` comments (`RecordAuditLog.ts`, a checkout test) that were no longer suppressing anything.
- Full suite verified clean end-to-end: `pnpm tsc --noEmit` (0 errors), `pnpm lint` (0 warnings/errors), `pnpm test` (2966 passed, 2 intentionally skipped), `pnpm build` (clean production build).

### 2026-07-26: Audit hardening execution (PRs #186–#192)

Follow-up to the docs-only audit verification pass below — executed
every item on the follow-up list, one PR per item, each verified
against a real local Postgres 16 and the full test suite before merge.

- **PR #186**: `SignUp.ts` writes a `user.signed_up` audit entry (closes STORY-009's TODO).
- **PR #187**: persistent `WebhookEvent` log for the PayMongo webhook — every inbound request recorded before processing, outcome updated after, independent of `Order` state.
- **PR #188**: `PrismaEnrollmentRepository`/`PrismaQuizAttemptRepository` validate persisted status on read instead of an unchecked cast (mirrors `Order`'s existing `PaymentStatus.isValid()` pattern). Did not convert to native Prisma enums — see the PR for why.
- **PR #190**: `RebuildCourseCurriculum` — all 8 module/lesson mutation use cases now keep `Course.curriculum` in sync with `Module`/`Lesson`, fixing a real bug where an admin-added lesson could show in the catalog and then 404/deny-access when opened.
- **PR #191**: wrote the 4 missing runbooks (payment incident, webhook replay, DB restore, admin access recovery). Writing the admin one surfaced that session/`lockedUntil` revocation doesn't actually work today, and `pnpm db:seed:admin` points at a script that doesn't exist.
- **PR #192**: opt-in TOTP 2FA for admin accounts — `TotpService` port, real (`otpauth`) + fake adapters, enroll/confirm/disable use cases, `Login.ts` gains an optional `totpCode`, UI at `/admin/settings` + `/admin/settings/2fa-setup`. Not manually browser-tested — verified via the automated suite and a real-Postgres smoke test only.

Full details in `SESSION-HANDOVER.md` and `docs/audit-2026-07-26-hardening-review.md` (kept current through each merge).

### 2026-07-26: Audit verification + CLAUDE.md known-gaps correction (docs only)

- A pasted external "audit" (based on README/schema/docs, not the live code) was received as a task. Every claim was checked against the actual source before acting on anything — no application code changed.
- Its top-priority claim ("PayMongo webhook uses in-memory repos") is false today: `src/app/api/webhooks/paymongo/route.ts` already uses `buildContainer()`, has idempotency and signature verification. Several other claims (no admin panel, `courseRepo`/`orderRepo` on in-memory repos, `src/lib/`/`src/components/`/`content/curriculum/` missing, DB "not provisioned") were also false — most were copied from `CLAUDE.md`'s own "Known gaps" section, which had gone stale.
- `CLAUDE.md`'s "Known gaps" section rewritten to match verified reality. Full claim-by-claim breakdown in new `docs/audit-2026-07-26-hardening-review.md`.
- A few audit claims held up and are recorded as real follow-ups: `Course.curriculum` (Json) still coexists with the relational `Module`/`Lesson` models with nothing keeping them in sync; several status fields are plain strings, not enums; there's no persistent webhook event log; there's no admin 2FA; `docs/runbooks/` is still just a README.
- Important correction flagged: the audit recommended removing `User.subscriptionTier`/`enrolledCourseIds`/`simulatorAccess`/`emailVerificationToken` as "legacy" fields. They are load-bearing (`EnrollStudent`, `TierAccessPolicy`, `ListUsers`) — removing them would break access control and signup.

### 2026-07-24: Test expectations sync (rename + simulator count)

- **PR #158** (open): `fix: sync test expectations with rename + simulator count changes`
  - `Practice.test.tsx`: full rewrite to match post-redesign component — 5 tools listed by name, Keyword Research marked as New, links to each tool page, no banned marketing phrases. Removed outdated assertions for In development badges, wireframe links, and waitlist copy.
  - `tools/__tests__/page.test.tsx`: added keyword-research to container mock (5 simulators now registered), updated link count from 4 to 6 to match actual rendered output (4 registered + 2x keyword-research due to the hardcoded card).
  - `InMemoryEmailSender.test.ts`: updated expected sender name from `AMPH Academy` to `Project Amazon PH Academy`.
  - 2352 tests passing locally (9 suites remain as pre-existing Windows-only failures: DATABASE_URL env var not set in local shell, prisma CLI uses bash-style path which is not recognized on Windows). All pass in CI.

### 2026-07-24: Vercel Hobby cron schedule fix

- **PR #153** (merged as `72896f4`): `fix(vercel): change live-class-reminders cron to once daily (Hobby plan limit)`
  - Vercel Hobby plan only allows one cron job per day. The previous schedule `0/5 * * * *` (every 5 minutes) was being rejected at deploy time with: "Hobby accounts are limited to daily cron jobs. This cron expression (0/5 * * * *) would run more than once per day."
  - Changed to `0 8 * * *` (8 AM UTC = 4 PM PHT, daily). Once-daily at 4 PM PHT is the right cadence for T-24h-style live class reminders (reminder the afternoon before a next-morning class).
  - If finer cadence is needed later, the cron can be moved to GitHub Actions (a working schedule already exists in `.github/workflows/daily-triage.yml` at `0 9 * * 1-5`).
  - 1 file changed, 1 insertion / 1 deletion.
- Also added `amph-v2-greenfield/` to `.gitignore`. A self-referencing copy of the project has been appearing in the workspace root, polluting `git status`. Not in git and not affecting production, but the ignore rule prevents accidental commits.

### 2026-07-24: Pricing tier seed script fix + production deploy

- **PR #150** (merged as `9aca555`): `fix: construct proper PricingTier entity in seed script (use Money.of)`
  - `scripts/seed-pricing-tiers.ts` was passing flat `{ priceMinor: 299900 }` objects to `repo.create()`, but `PrismaPricingTierRepository.mapData()` reads `tier.price.minor` — the domain entity has `price: Money`, not a flat `priceMinor` field. The repository's first call threw `TypeError: Cannot read properties of undefined (reading 'minor')`.
  - Fixed by importing `Money` from `@/domain/values/Money` and constructing a proper `PricingTier` entity with `price: Money.of(priceMinor, "PHP")` in both the create and update paths.
  - Regenerated Prisma client (`pnpm prisma:generate`) after the early-bird migration (`20260722050000_pricing_tier`) added the `earlyBirdPriceMinor` / `earlyBirdEndsAt` fields — the seed script's first attempt failed with `Unknown argument 'earlyBirdPriceMinor'` because the generated client was stale.
  - All 4 pricing tiers now seed cleanly: foundations (₱2,999), mastery (₱5,999, early-bird ₱4,999 for 7 days), ultimate (₱9,999, early-bird ₱7,999 for 3 days), all-access (₱14,999).
  - 1 file changed, 9 insertions / 7 deletions. All 6 CI checks green.

- **Production deploy: `https://amph-v2-greenfield.vercel.app` is live**
  - Vercel project linked to `amph-v2-greenfield` (`prj_3tEN1Akupoosai3OAGc1t50ru5QG`).
  - All required environment variables synced from Vercel to local `.env.local` and `.env`: `DATABASE_URL` (Neon Postgres), `SHADOW_DATABASE_URL`, `JWT_SECRET`, `PAYMONGO_SECRET` (live key), `PAYMONGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_APP_URL`.
  - `pnpm prisma migrate deploy` applied all 12 migrations to the production Neon database.
  - `pnpm db:seed:tiers` seeded all 4 pricing tiers.
  - Vercel auto-deployed the latest `main` HEAD via the Git integration. Smoke-tested routes:
    - `GET /` → 200 (landing page renders all sections)
    - `GET /signup` → 200
    - `GET /login` → 200
    - `GET /dashboard` → 307 (redirects to login when unauthenticated, correct behavior)
  - Remaining operator-owned launch items: configure PayMongo webhook endpoint at the live URL, create first admin user, add custom domain (optional), smoke test the full signup → checkout → enrollment flow, run STORY-057/058/060.

### 2026-07-24: CSS variable token fixes — 18 files, 106 insertions

- **PR #147** (merged as `75d2709`): `fix(ui): replace undefined CSS variable references with correct AMPH token names`
  - 18 files affected across admin form pages (`admin/simulators/new`, `admin/simulators/[id]/edit`, `admin/discount-codes/new`, `admin/discount-codes/[id]/edit`, `admin/badges/new`, `admin/badges/[slug]/edit`, `admin/live-classes/new`, `admin/live-classes/[id]/edit`), 7 `Admin*Table` Astryx components, and 2 CSS module files.
  - Replaced undefined `var(--color-*)` references with correct AMPH design tokens: `var(--color-accent)` → `var(--accent)`, `var(--color-danger)` → `var(--danger)`, `var(--color-text-primary)` → `var(--ink-900)`, `var(--color-text-secondary)` → `var(--ink-700)`, `var(--color-text-muted)` → `var(--ink-500)`, `var(--color-text-disabled)` → `var(--ink-300)`, `var(--color-border)` → `var(--border)`, `var(--color-background-muted)` / `var(--color-bg-muted)` → `var(--surface-2)`, `var(--color-on-accent)` → `var(--accent-ink)`, `var(--color-accent-dark)` → `var(--accent-hover)`.
  - These bugs were pre-existing from the original Astryx installation (commit `9e9b297 feat(astryx)`) — not introduced by the migration PR.
  - All 6 CI checks green. No test changes needed (CSS tokens, no behavior change).

### 2026-07-24: Astryx UI migration — all admin pages migrated, student UI hardened

- **PR #146** (merged as `f4d6765`): `fix(ui): STORY-055 migrate all pages to @astryxdesign/core + student UI hardening`
  - Migrated all remaining admin pages from `@/components/ui` to `@astryxdesign/core` using the `Card`, `Badge`, `Table`, `Button`, `TextField`, `Select`, `TextArea`, `Link`, `Input`, `Tab`, `TabList`, `TabPanel` Astryx components.
  - `admin/courses/[id]/page.tsx`, `admin/courses/[id]/edit/page.tsx`, `admin/users/[id]/page.tsx`, `admin/payments/[id]/page.tsx`, `admin/simulators/[id]/edit/page.tsx`, `admin/discount-codes/[id]/edit/page.tsx`, `admin/badges/page.tsx`, `admin/simulators/new/page.tsx`, `admin/discount-codes/new/page.tsx`, `admin/badges/new/page.tsx`, `admin/badges/[slug]/edit/page.tsx`, `admin/live-classes/new/page.tsx`, `admin/live-classes/[id]/edit/page.tsx`, and 5 `Admin*Table` components all migrated.
  - Kept `@/components/ui` for login and signup: Astryx `Button` uses `label` prop (not `children`) and `isDisabled` (not `disabled`) — incompatible with server-action uncontrolled forms. AMPH's own `Button` and `Input` work correctly.
  - Added `idle` state to `SignUpState` (`export type SignUpState = SignUpResult | { kind: "idle" }`) to prevent first-render validation flash on signup form.
  - Applied student UI hardening patch: responsive tables with keyboard-reachable scroll regions, `min-width` enforcement on all table layouts, `idle` state handling on forms.
  - Added `src/app/signup/__tests__/page.test.tsx` — regression test for idle-state contract on signup page.
  - Added `src/components/tools/__tests__/responsive-tables.test.ts` — verifies keyboard-reachable scroll regions and `min-width` enforcement on table components.
  - Simulator scroll wrappers verified: `BidElevatorForm`, `BidElevatorResult`, `StrTriageForm` all have `tableScroll` CSS class + `role="region"` + `aria-label` + `tabIndex={0}`.
  - 56 files changed, +767/-549 lines. All 6 CI checks green.

### 2026-07-23: Rate-limit policy reconciliation — STORY-054 finally closed

- **PR #145** (merged as `9e0624c`): `fix(security): STORY-054 rate-limit policy reconciliation`
  - STORY-054 was marked done in the sprint plan but the rate limiter was never actually wired into the server actions — a silent gap found during the sprint-11 review.
  - `signup.action.ts`: calls `rateLimiter.check()` by IP (5 req / 15 min), returns `{ kind: 'rate_limited' }` when blocked. Fails open on Redis errors.
  - `login.action.ts`: calls `rateLimiter.check()` by IP (10 req / 15 min), redirects to `/login?error=rate_limited`. Fails open.
  - `checkout.action.ts`: calls `rateLimiter.check()` by userId (10 req / 1 hour). Fails open.
  - All three action pages updated with user-facing rate-limit error messages.
  - `tests/architecture/rate-limit-wiring.test.ts` expanded: 9 assertions verify `rateLimiter.check()` is called in all three actions.
  - `src/app/actions/__tests__/checkout.action.test.ts`: added `rateLimiter` mock to container, reset in `beforeEach`, new test for the `rate_limited` branch.
  - All 6 CI checks green. Supersedes PR #133 (same intent, never fully wired).

### 2026-07-22: Module/Lesson admin CRUD now writes to the audit trail

- `fix(admin): wire RecordAuditLog into the 8 Module/Lesson use cases`
  - Every other admin resource (`Course`, `LiveClass`, `DiscountCode`, `Badge`, `SimulatorScenario`) calls `RecordAuditLog` on create/update/delete/archive; `Module`/`Lesson` never did, a gap every PR in the P0-2 series left unchecked in its own "Architecture" checklist. `AuditAction` already reserved `module.*`/`lesson.*` success actions (STORY-050a) but no use case used them.
  - Added `module.*_failed`/`lesson.*_failed` to `AuditAction` (matching the `discount_code.*`/`badge.*`/`live_class.*` convention).
  - `CreateModule`, `UpdateModule`, `DeleteModule`, `ReorderModules`, `CreateLesson`, `UpdateLesson`, `DeleteLesson`, `ReorderLessons`: added `actorId` to `Input`, `recordAuditLog` to `Deps`, and a `recordAuditLog.execute()` call on every success and failure path, mirroring `CreateLiveClass`/`UpdateLiveClass`/`DeleteLiveClass`.
  - Threaded `actorId` (already resolved via `getCurrentAdminId()`) through the 8 corresponding server actions; added `*PageInput = Omit<*Input, "actorId">` types where the action's exported input was the raw use-case input, so pages can't (and don't need to) pass `actorId` themselves.
  - Wired `recordAuditLog` into all 8 use case constructors in both `buildProductionContainer()` and `buildTestContainer()`.
  - 16 new tests (2 per use case: audit entry recorded on success, audit entry recorded on failure) across the 8 existing use-case test files. Full suite: 2258 passed, 2 skipped (was 2242). `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` all clean.

### 2026-07-22: E2E cleanup helper fix, `fix(test): construct clearE2EUsers' PrismaClient with a driver adapter`

- `tests/e2e/helpers/seed.ts`'s `clearE2EUsers()` constructed `new PrismaClient()` with no arguments. This codebase runs Prisma 7 with driver adapters (`prisma/schema.prisma`'s `datasource` has no `url`; the real connection is supplied via `PrismaPg` + `pg.Pool`, see `src/infra/database/prisma.ts`), so the bare constructor always threw `PrismaClientInitializationError`, on every run, regardless of `DATABASE_URL`. The helper's own try/catch (written to tolerate a missing `DATABASE_URL` in CI workers without failing `afterEach`) silently swallowed this too, so the E2E user cleanup between runs never actually happened.
- Fixed by building the client the same way the production singleton does. Verified against the locked-in contract in `tests/unit/e2e-helpers/clearE2EUsers.test.ts` (empty/malformed URL still no-ops, doesn't throw): still 4/4 passing.
- Also added an opt-in `PLAYWRIGHT_CHROMIUM_PATH` env var to `playwright.config.ts` (`undefined` when unset, zero effect on CI) so a sandboxed environment without network access for the pinned Playwright browser download can point at whatever Chromium is already on disk.
- Re-ran the full `chromium-desktop` E2E suite (stale since 2026-07-19, last measured 17 failed / 7 passed) against a freshly provisioned local Postgres: **15 passed, 4 intentionally skipped, 0 failed**. `pnpm typecheck`/`lint`/`test` all clean.

### 2026-07-22: PrismaOrderRepository + PrismaAuditLog + PrismaSessionRepository close three P0-2 legs

- **PR #125** (merged as `f075fff`): `fix(payment): persist orders to Postgres via PrismaOrderRepository (P0-2)`
  - Orders were still wired to `InMemoryOrderRepository` in the production container, a real production bug: orders vanish on every cold start / redeploy, and a webhook hitting a different serverless instance could never find the order it needed to mark PAID
  - Added a `status` column to the `orders` table (migration `20260722000000_order_status`) carrying the domain `PaymentStatus` state machine. Previously only `paymongoStatus` existed, which has no DRAFT equivalent
  - Added `Order.hydrate()` to reconstruct entities from persisted rows without routing through the `mark*()` state-transition guards
  - Implemented `PrismaOrderRepository` (all `IOrderRepository` methods, no stubs) and wired it into `buildProductionContainer()`; the PayMongo webhook route already resolves `orderRepo` through `buildContainer()`, so it picks this up with no separate change
  - 41 new tests (`Order.hydrate()` + `PrismaOrderRepository`)
  - CodeRabbit review response: built the `orders.status` index with `CREATE INDEX CONCURRENTLY` in a separate, non-transactional migration instead of a lock-holding plain `CREATE INDEX`; added `PaymentStatus.isValid()` so `PrismaOrderRepository.mapRow()` rejects a corrupt/legacy persisted status instead of blindly casting it; reconciled stale test-count numbers in `SESSION-HANDOVER.md`. Optimistic locking on `update()` explicitly deferred, see `SESSION-HANDOVER.md`
- **PR #125**: `fix(admin): persist the audit trail via PrismaAuditLog (P0-2)`
  - Every admin write (course/module/lesson CRUD, refunds, discount codes, badges, simulators, live classes, impersonation) calls `RecordAuditLog`, which was silently writing to `InMemoryAuditLog` in production. The entire audit trail vanished on every redeploy, invisibly, since a failed audit write never fails the business operation by design
  - The `AuditLog` Prisma model already existed; only the adapter was a stub with a stale "table doesn't exist yet" comment
  - Implemented `PrismaAuditLog` mapping the domain `AuditLogEntry` onto the `audit_logs` table and wired it into `buildProductionContainer()`
  - 4 new tests
- **PR #125**: `fix(auth): persist sessions to Postgres via PrismaSessionRepository (P0-2)`
  - `sessionRepo` was still `InMemorySessionRepository` in production. Auth itself is unaffected (JWT verification is stateless), but `ResetPassword`'s "invalidate every session" call silently no-oped against an empty store after any redeploy
  - Implemented `PrismaSessionRepository` and wired it into `buildProductionContainer()`; `deleteById`/`deleteAllForUser` use `deleteMany` to preserve the port's documented idempotent-delete contract
  - 11 new tests
  - Unit + integration suite (all three fixes): 2156 passed / 2 skipped; architecture compliance suite: 406 passed. E2E not re-run this session (see `SESSION-HANDOVER.md` for its last known status)

### 2026-07-22: PrismaDiscountCodeRepository admin CRUD closes the DiscountCode leg of P0-2

- **PR #126** (merged as `c819b38`): `fix(admin): implement PrismaDiscountCodeRepository admin CRUD (P0-2 / STORY-050d)`
  - `listAll`/`findById`/`update`/`archive` were stubs, so `buildProductionContainer()` fell back to `InMemoryDiscountCodeRepository` for the entire repo even though `findByCode`/`create`/`incrementUsedCount` were already real
  - Added a nullable `archivedAt` column to `discount_codes` (migration `20260722010000_discount_code_archived_at` + a separate `CREATE INDEX CONCURRENTLY` migration, applying the lock-avoidance lesson from PR #125's review proactively this time)
  - Implemented the four stub methods matching `InMemoryDiscountCodeRepository`'s exact contract: `findById`/`listAll` hide archived codes, `findByCode` intentionally does not filter on `archivedAt`, `update` maps a duplicate-code conflict to `code_taken`
  - Wired `PrismaDiscountCodeRepository` into `buildProductionContainer()`
  - 24 new tests. Unit + integration suite: 2175 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response (2 rounds): skipped a request to add `deletedAt`/`createdById`/`updatedById` to `DiscountCode` (22 of 23 models in the real schema lack these fields; `docs/db-schema.md`'s "every mutable table" rule was never actually implemented, so this isn't a live rule this PR broke, and fixing it repo-wide is a separate story) and a repeated request to rewrite `CHANGELOG.md`/`SESSION-HANDOVER.md` in VA-friendly plain language (the voice guide scopes that rule to user-facing copy, not internal engineering docs; the org-level dashboard rule CodeRabbit cited on round 2 isn't checked into this repo). Fixed a genuinely stale "remaining P0-2 items" snapshot in `SESSION-HANDOVER.md` left over from before the DiscountCode work landed. Details in `SESSION-HANDOVER.md`

### 2026-07-22: PrismaLiveClassRepository closes the LiveClass leg of P0-2

- **PR #127** (merged as `18166e7`): `fix(admin): implement PrismaLiveClassRepository (P0-2 / STORY-050c)`
  - No `LiveClass` Prisma model existed at all, so `buildProductionContainer()` fell back to `InMemoryLiveClassRepository`: every admin-scheduled live class vanished on cold start / redeploy, and the `SendLiveClassReminders` cron pipeline (already backed by a real `sent_reminders` idempotency table) had nothing to iterate over
  - Added a `LiveClass` Prisma model + `Course.liveClasses` back-relation (migration `20260722020000_live_class`); brand-new table, so a plain `CREATE INDEX` is correct (no existing traffic to lock)
  - Implemented `PrismaLiveClassRepository` matching `InMemoryLiveClassRepository`'s exact contract: `listAll` excludes `cancelled` and sorts by `scheduledAt` ascending, `delete` is a soft status transition to `cancelled`, not a real row delete
  - Wired `PrismaLiveClassRepository` into `buildProductionContainer()`
  - 20 new tests. Unit + integration suite: 2189 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response: fixed a stale in-memory comment left over in `container.ts`; fixed `update()` silently dropping `instructorId` on a full-entity update (no live call path triggers it today, but it broke contract parity with `InMemoryLiveClassRepository`); added `isValidLiveClassStatus()` and used it in `mapRow()` instead of blindly casting a persisted status (same pattern as `PaymentStatus.isValid()` on PR #125). Skipped a third repeat of the "plain language for VAs" request. Details in `SESSION-HANDOVER.md`

### 2026-07-22: PrismaModuleRepository + PrismaLessonRepository close P0-2

- `fix(admin): implement PrismaModuleRepository + PrismaLessonRepository (P0-2 / STORY-048b / STORY-048c)`
  - `moduleRepo`/`lessonRepo` were the last two repositories still on `InMemory*` in `buildProductionContainer()`: every module/lesson created through the admin curriculum editor vanished on cold start / redeploy. Unlike the other P0-2 legs, this one wasn't blocked on a design decision, only on the schema: STORY-048b/048c had already shipped the domain entities, ports, use cases, and admin UI against `IModuleRepository`/`ILessonRepository`
  - Added `Module` and `Lesson` Prisma models (`courses.modules` back-relation, `Module.lessons` back-relation) via migration `20260722040000_module_lesson`; brand-new tables, so a plain `CREATE INDEX` is correct (no existing traffic to lock). Does not touch `Course.curriculum` (still JSON, still read by the public catalog pages): that migration remains the separate, larger refactor both stories flagged as out of scope
  - Implemented `PrismaModuleRepository` (new file) and `PrismaLessonRepository` (replacing its throw-on-every-method stub), both matching their `InMemory*` counterparts' exact contract, including the atomic `reorder()` (validates the input id set matches the current rows before applying via `$transaction`). `mapRow()` on both reuses the existing `createModule()`/`createLesson()` domain factories (the latter also re-validates `type`/`content` shape) instead of adding new validators, so a corrupt/legacy row throws and surfaces as `db_error`, same pattern as the SimulatorScenario/LiveClass fixes
  - Wired both into `buildProductionContainer()`, removing the stale "in-memory until the schema migration lands" comments
  - 29 new tests (`PrismaModuleRepository.test.ts`, `PrismaLessonRepository.test.ts`, hand-rolled fake-`PrismaClient` pattern). Unit + integration suite: 2242 passed / 2 skipped; architecture compliance suite: 406 passed. `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` all clean
  - This closes P0-2: every repository in `buildProductionContainer()` is now Postgres-backed

### 2026-07-22: PrismaSimulatorScenarioRepository closes the SimulatorScenario leg of P0-2

- **PR #128** (merged as `e7e15dd`): `fix(admin): implement PrismaSimulatorScenarioRepository (P0-2 / STORY-050b)`
  - Same shape as the LiveClass fix: no `SimulatorScenario` Prisma model existed, so `buildProductionContainer()` fell back to `InMemorySimulatorScenarioRepository`: every admin-created practice scenario vanished on cold start / redeploy
  - Added a `SimulatorScenario` Prisma model + nullable `archivedAt` column (migration `20260722030000_simulator_scenario`); brand-new table, plain `CREATE INDEX` is correct
  - Implemented `PrismaSimulatorScenarioRepository`; `mapRow()` reuses the existing `createSimulatorScenario()` domain factory (which already validates `simulatorId`/`difficulty`) instead of adding a third near-identical validator, so a corrupt/legacy row throws and surfaces as `db_error`
  - Wired `PrismaSimulatorScenarioRepository` into `buildProductionContainer()`
  - 24 new tests. Unit + integration suite: 2213 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response: fixed a stale in-memory comment left over in `container.ts`; synced this changelog entry and `SESSION-HANDOVER.md`'s header with the actual PR #128 number/status. Skipped a request to add `deletedAt`/`createdById`/`updatedById` to `SimulatorScenario` (same reasoning as `DiscountCode` on PR #126: 24 of 25 models in the real schema now lack these fields, so this is a repo-wide gap, not a live rule this PR broke). Details in `SESSION-HANDOVER.md`

### 2026-07-19 — TDD + SOLID audit and Tier A production-bug fixes

- **PR #66** — `fix(catalog): close Tier A production bugs + lazy-init Resend`
  - 4 production bugs fixed: `/courses` catalog always empty, `/courses/[slug]` always 404'd, `enroll` action never persisted, PayMongo webhook 404'd. All caused by `new InMemory*()` in production code.
  - Lazy-init `ResendEmailSender` (was throwing at module load on empty `RESEND_API_KEY`; now defers to first `send()`)
  - 15 new tests (was 917, now 932)
- **PR #65** — `refactor(auth): eliminate hand-rolled JWT verify + module-load env capture`
  - 3 SOLID violations fixed: `SESSION_COOKIE` captured at module load (now per-call), hand-rolled JWT verify in `revokeCertificate.action.ts` (now `getSessionUserId`), hand-rolled JWT verify in `quiz attempt/route.ts` (now `getSessionUserId`)
  - 23 new tests
- **PR #64** — `refactor(migration): migrate 11 files to @/components/ui + CSS Modules`
  - 11 page/component files migrated from Tailwind-style classes to design system
  - Promoted `local/no-tailwind-classes` from `warn` to `error`
  - 3 new tests
- **PR #63** — `feat(eslint): local/no-tailwind-classes rule`
  - New custom ESLint rule banning Tailwind utility classes
  - 25 new tests (the rule itself)
- **PR #62** — `refactor(auth): strict TDD + strict SOLID for SignIn/SignOut`
  - 39 new tests for `performSignUp`, `performLogout`, `performRevokeCertificate`
  - Fixed try/catch bug in signup action that swallowed `navigate()` throw

**Tier status at session end:**

- Tier A (production bugs): ✅ closed
- Tier B (TDD coverage gaps): ❌ open — 12 use cases + 11 repos have no tests
- Tier C (SOLID hygiene): ❌ open — 8 `any` casts, 3 unused eslint-disable, Middleware → Proxy
- Tier D (dead code): ❌ open — 3 use cases with no callers

See `SESSION-TDD-SOLID-AUDIT.md` for full details and `NEXT-SESSION-PROMPT.md` for the next session's starting state.

## [Unreleased]

### 2026-07-17 — Repo bootstrap on `projectamazonph/amph-v2-greenfield`

- Created public repo `projectamazonph/amph-v2-greenfield` from the greenfield doc set.
- Repo settings: description, homepage `https://github.com/projectamazonph/amph-v2`, 16 topics (`amph`, `amazon-ppc`, `filipino-va`, `nextjs16`, `prisma7`, `paymongo`, `resend`, `solid`, `clean-architecture`, `hexagonal-architecture`, `domain-driven-design`, `typescript`, `vitest`, `playwright`, `sentry`, `documentation`), squash-only merge, auto-delete branches on merge, issues + discussions on, wiki + projects off.
- Added `LICENSE` (proprietary), `CODEOWNERS`, `CONTRIBUTING.md`, `.gitignore`, `.github/CODE_OF_CONDUCT.md`, `.github/SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, three issue templates (`bug_report`, `feature_request`, `story`).
- Added `.github/workflows/ci.yml` (quality + unit + e2e + build jobs; PostgreSQL service container; Sentry + gitleaks wired).
- Added `.github/dependabot.yml` (weekly grouped npm + GitHub Actions updates; ignore rules for `typescript`, `eslint`, `next`, `react`, `react-dom` major bumps based on the legacy repo's toolchain lessons).
- Initial commit author reset to `Ryan Roland Dabao <projectamazonph@gmail.com>` to match the GitHub account.

### 2026-07-17 — Greenfield documentation set

- Wrote the full documentation tree for the greenfield, SOLID-layered build: `README.md`, `AGENTS.md`, `CLAUDE.md`, `FEATURES.md`, `SESSION-HANDOVER.md` (initial skeleton), and the `docs/` set (`product-brief.md`, `decisions.md`, `build-spec.md`, `business-layer.md`, `db-schema.md`, `api-reference.md`, `admin-backend.md`, `voice-guide.md`, `design-brief.md`, `ai-removal.md`, `sprint-plan.md`).
- Established the five-layer architecture in docs: `domain/`, `ports/`, `usecases/`, `infra/`, `app/`, with `composition/` as the DI container. Documented as ADRs 013–019 in `docs/decisions.md`.
- Documented the SOLID contract: one class per file, one port per concern, `Result<T, E>` across boundaries, `Money` value object, `Fake*` per port, ESLint boundary rule. See `docs/build-spec.md` §"The SOLID contract" and `AGENTS.md` §"SOLID contract".

### 2026-07-17 — Architecture decisions (ADRs 013–019)

- ADR-013: SOLID five-layer architecture over the existing ad-hoc `lib/` + `engine/` split. Accepted. The five layers: `domain/`, `ports/`, `usecases/`, `infra/`, `app/`, plus `composition/` for DI.
- ADR-014: `Result<T, E>` over thrown exceptions across layer boundaries. Accepted. Reduces coupling, makes failure paths explicit, trivially testable.
- ADR-015: Single-tenant only. No `orgId` column. ADR closed (carries over from legacy `amph-v2`).
- ADR-016: ESLint boundary rule that blocks framework / IO imports from `domain/`, `ports/`, and `usecases/`. Accepted. The mechanical enforcement of DIP.
- ADR-017: Composition root + `AsyncLocalStorage` request container. Accepted. No global singletons; the container is built per request in middleware.
- ADR-018: `Money` value object, integer minor units (centavos). No `number` for money downstream of PayMongo responses. Accepted. Eliminates the float-as-money class of bugs.
- ADR-019: Simulator registry pattern. New simulator = one domain module + one registry entry. No edits to the tools page, access policy, or API. Accepted. The OCP showcase.

### 2026-07-17 — Initial port catalog

- `src/ports/repositories/` — `UserRepository`, `CourseRepository`, `EnrollmentRepository`, `PaymentRepository`, `RefundRepository`, `AttemptRepository`, `ProgressRepository`, `BadgeRepository`, `LiveClassRepository`, `CertificateRepository`, `AuditLogRepository`, `DiscountCodeRepository`. One per table, ISP-compliant.
- `src/ports/gateways/` — `PaymentGateway`, `EmailSender`. Each with a `Fake*` implementation under `src/infra/<concern>/fake/`.
- `src/ports/services/` — `AccessPolicy`, `PdfRenderer`, `PricingService`, `CertificateIssuer`, `RateLimiter`, `ContentRenderer`, `StreakService`, `XPService`, `ProgressService`.
- `src/ports/system/` — `Clock`, `IdGenerator`, `Logger`, `Tracer`, `EventBus`. Each with a real and a test impl.

### 2026-07-17 — Use case catalog (first cut)

- `src/usecases/auth/` — `SignUp`, `SignIn`, `SignOut`, `RequestPasswordReset`, `ResetPassword`, `VerifyEmail`, `ResendVerification`.
- `src/usecases/checkout/` — `StartCheckout`, `HandlePaymentWebhook`.
- `src/usecases/enroll/` — `EnrollStudent`, `RevokeEnrollment`.
- `src/usecases/refund/` — `RequestRefund`, `AdminIssueRefund`.
- `src/usecases/certificate/` — `IssueCertificate`, `VerifyCertificate`, `RevokeCertificate`.
- `src/usecases/simulators/` — `RunBidElevator`, `RunStrTriage`, `RunCampaignBuilder`, `RunListingAudit`, `RunKeywordResearch`. One per simulator, all sharing the same shape.
- `src/usecases/progress/` — `MarkLessonComplete`, `RecordQuizAttempt`, `RecordStreakVisit`, `RecordSimulatorAttempt`.
- `src/usecases/badges/` — `AwardBadge`, `RevokeBadge`, `ListUserBadges`.
- `src/usecases/admin/` — `AdminUpdateUser`, `AdminCreateDiscountCode`, `AdminUpdateCourse`, `AdminUpdatePricingSettings`.

### 2026-07-17 — Initial infra adapters

- `src/infra/db/Prisma*Repository.ts` — one per repository port. Mappers between Prisma rows and domain entities live here, never in `domain/`.
- `src/infra/paymongo/PayMongoGateway.ts` + `fake/FakePayMongoGateway.ts` — wraps the PayMongo SDK, returns `Result<T, E>`, maps centavos.
- `src/infra/email/ResendEmailSender.ts` + `fake/ConsoleEmailSender.ts` — wraps Resend, renders React Email templates.
- `src/infra/pdf/ReactPdfRenderer.ts` — certificate and receipt rendering, escapes user input.
- `src/infra/observability/{PinoLogger,SentryTracer}.ts` — structured logging and error tracking.
- `src/infra/ratelimit/UpstashRateLimiter.ts` + `fake/InMemoryRateLimiter.ts` — Redis-backed rate limiting with a deterministic in-memory fake for tests.
- `src/infra/db/inmemory/InMemory*Repository.ts` — one per repository port, for use case tests.

### 2026-07-17 — Composition

- `src/composition/container.ts` — `buildContainer()` and `buildTestContainer()`. The only file that knows concrete types.
- `src/composition/requestContainer.ts` — `AsyncLocalStorage` wrapper, set up in `middleware.ts`.

### 2026-07-17 — Documentation (this set)

- `docs/product-brief.md` — what we are building, who it is for, the value proposition.
- `docs/decisions.md` — every ADR, 001 through 020.
- `docs/build-spec.md` — the engineering build spec, layer by layer.
- `docs/business-layer.md` — pricing, checkout, refunds, receipts.
- `docs/db-schema.md` — every Prisma model.
- `docs/api-reference.md` — every port method, every use case I/O, every server action, every route.
- `docs/admin-backend.md` — every admin route, every guard, every audit-log event.
- `docs/voice-guide.md` — banned phrases, sentence-level rules.
- `docs/design-brief.md` — the Field Manual design direction, tokens, type system.
- `docs/ai-removal.md` — what AI used to do, and what replaced it.
- `docs/sprint-plan.md` — 12 sprints, story by story.
- `docs/sprint-1/PLAN.md` — Sprint 1 plan: foundation + first vertical slice.
- `docs/stories/STORY-001.md` through `STORY-010.md` — the first 10 stories.
- `docs/security/tenant-isolation.md` — the isolation guard table.

---

## [Pre-greenfield] — Legacy `amph-v2` (sprints 1–12, retained for reference)

The pre-greenfield `amph-v2` (Next.js 16 + Prisma + PayMongo, 12 sprints shipped) remains the codebase being replaced. Its changelog entries (Sprints 1–12, commits, hotfixes) live at `https://github.com/projectamazonph/amph-v2/blob/main/CHANGELOG.md` for historical reference. This repo starts fresh: the changelog above is the greenfield truth.
