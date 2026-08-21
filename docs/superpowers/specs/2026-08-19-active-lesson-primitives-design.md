# Active Lesson Primitives — Design Spec

**Status:** Draft, pending user review
**Date:** 2026-08-19
**Owner:** Ryan Roland Dabao
**Scope:** This design is an execution layer for `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` tickets LEARN-020 to LEARN-029. It does not introduce new tier, simulator, or domain concepts. It does not redefine the curriculum. It expands the lesson production schema with concrete, shippable interactive and visual blocks, then applies them to Module 1.

---

## 1. Goal

Make each Module 1 lesson active instead of read-only. Replace passive text where it does not earn its keep with three visual primitives (TradeOffTable, ProcessDiagram, PitfallCallout) and one interactive primitive (SelfCheck). Honor the existing lesson production schema (outcome, decision, worked example, active attempt, feedback, evidence, retrieval cue). Do not regress the voice guide, the design brief, or the SOLID five-layer boundary.

## 2. Non-goals

- No grading, no XP, no leaderboard, no persistence of self-check answers.
- No new `Lesson.type`, no new domain entity, no new port method.
- No simulator addition (AGENTS.md Rule: no 6th simulator without registry entry).
- No public claim changes (counts, time, tools, tiers stay where they are).
- No analytics events for self-checks (reserved for LEARN-060).
- No external dependency added unless `remark-directive` is already in `pnpm-lock.yaml`; otherwise we ship a small custom plugin.

## 3. Decisions summary

| Decision | Choice | Why |
| --- | --- | --- |
| Scope | Treat as LEARN-020 to LEARN-029 execution. | Avoids re-architecture. The plan already covers the broader curriculum work; this design fills the gap between the schema and the rendered lesson. |
| Block set | SelfCheck + TradeOffTable + ProcessDiagram + PitfallCallout. | Matches user's request for inline interactivity and visuals without persistence or grading. |
| Pilot target | Module 1 (`content/curriculum/modules/1-foundations/`). | Heaviest calculation content. Best stress test for self-check + visuals. 5 lessons, contained delta. |
| Authoring syntax | Hybrid. Visual primitives are fenced callouts (`:::trade-off`, `:::process`, `:::callout`). SelfCheck is inline JSX. | Match existing fact-card convention; let structured data live where structure helps. |
| State | SelfCheck is `'use client'` with `useState` only. Session-only. | Smallest delta. Matches the user's stated goal of "check your understanding" rather than assessment. |
| Visual primitives state | Server-rendered. No runtime state. | Maximizes reading speed, smallest client bundle impact. |
| Persistence | None. Refresh the page, you start over. | Confirmed by user during brainstorming. |
| Renderer integration | Extend `src/app/courses/[slug]/lessons/LessonContent.tsx` with a directive plugin and a component map. Do not swap the MDX runtime. | Story-026 already ships `react-markdown` + `remark-gfm`. Wider refactor is out of scope. |
| New dependency | Only if `remark-directive` already in lockfile. Otherwise hand-rolled parser. | AGENTS.md forbids adding deps without updating lockfile. |

## 4. Primitives

### 4.1 SelfCheck (interactivity)

File: `src/components/lesson/SelfCheck.tsx`. `'use client'`. Local `useState`. No `useEffect`. No `localStorage`. No backend call.

Props:
```ts
interface SelfCheckProps {
  id?: string;
  prompt: string;
  options: readonly string[];
  answerIndex: number;
  explanation: string;
  revealLabel?: string;     // default "Check"
  retryLabel?: string;      // default "Try again"
}
```

Behavior:
- Initial: options visible, no answer selected, no feedback.
- After selection: feedback appears with right/wrong + the `explanation`. A `Try again` button resets.
- Validation at author time: `options.length ∈ [2,5]`, `answerIndex ∈ range`, `explanation` ≥ 12 chars.

Accessibility:
- Option list: `role="radiogroup"`, `aria-labelledby={promptId}`.
- Each option: `role="radio"`, `aria-checked`, focus managed with arrow keys.
- Feedback: `role="status"`, `aria-live="polite"`.
- Color is never the only signal. Right/wrong use color + icon + text.
- Keyboard: arrow keys cycle focus, Enter activates, Tab moves to `Try again` after answer reveal.

### 4.2 TradeOffTable (visual)

File: `src/components/lesson/TradeOffTable.tsx`. Server component. Native `<table>`.

Props:
```ts
type TradeOffRow = { readonly label: string; readonly value: string };

interface TradeOffTableProps {
  id: string;
  title: string;
  caption?: string;
  // One of the two forms below
  columns?: readonly string[];
  rows?: readonly TradeOffRow[];
  pairs?: readonly TradeOffRow[];
}
```

Behavior:
- `columns` + `rows` form: rectangular. Caption is a `<caption>`. Headers are `<th scope="col">`.
- `pairs` form: two-column key/value with `<th scope="row">`.
- Always scrolls horizontally on `< 640px` with a labelled wrapper.

### 4.3 ProcessDiagram (visual)

File: `src/components/lesson/ProcessDiagram.tsx`. Server component. CSS-only.

Props (internal contract for the React component; the authoring syntax lives in Section 5.1):
```ts
interface ProcessStep { readonly id: string; readonly label: string; readonly hint?: string; }

interface ProcessDiagramProps {
  id: string;
  title: string;
  steps: readonly ProcessStep[];
  layout?: "horizontal" | "vertical";   // default horizontal; mobile collapses to vertical
}
```

Behavior:
- Renders an `<ol>` with each step as an `<li>`.
- Step has icon slot (Phosphor) + label + optional hint block.
- Authoring uses pipe-delimited labels (`steps="Read|Decide|Change|Explain"`). The parser generates stable IDs from the order (`step-0`, `step-1`, ...). `hint` is set via a separate `hint="..."` directive-attribute applied to the whole diagram; per-step hints are reserved for a future authoring form to keep the pipe syntax legible.
- Decision rule: if a step needs more than icon + label + hint, it doesn't belong here. Use a paragraph.

### 4.4 PitfallCallout (visual)

File: `src/components/lesson/PitfallCallout.tsx`. Server component.

Props:
```ts
interface PitfallCalloutProps {
  id: string;
  variant: "info" | "warning" | "pitfall";   // default "info"
  title?: string;
  children: React.ReactNode;
}
```

Behavior:
- Renders `<aside role="note">` with token-driven color and Phosphor icon.
- Icon is decorative (`aria-hidden`).
- Not dismissible.
- WCAG AA contrast required for all variants against `--surface-0` and `--surface-1`.

## 5. Authoring contract

New doc: `content/curriculum/AUTHORING.md`. Appended to `content/README.md` summary.

### 5.1 Visual primitives (fenced callouts)

```mdx
:::trade-off{id="big-six" title="The Big Six" caption="What each metric answers"}
| Metric | What it answers |
| --- | --- |
| CPC | How much per click |
| CTR | How often the ad gets clicked |
| CVR | How often the click becomes an order |
| ACoS | Ad spend relative to ad-attributed sales |
| ROAS | Ad-attributed sales relative to ad spend |
| TACoS | Ad spend relative to total sales |
:::

:::process{id="work-loop" title="Your work loop" steps="Read|Decide|Change|Explain" hint="If you can't explain why, don't change yet."}

:::callout{id="pitfall-no-bid-cut" variant="pitfall" title="Don't cut a bid on the first high ACoS"}
You don't know yet whether the problem is the click or the conversion. Read the pattern first.
:::
```

### 5.2 SelfCheck (JSX)

```mdx
<SelfCheck
  id="cpc-affordability"
  prompt="If a campaign's CPC exceeds the max-CPC you computed, your first move is to:"
  options={["Cut the bid", "Check search terms and listing", "Pause the campaign", "Add more keywords"]}
  answerIndex={1}
  explanation="Never cut a bid until you know whether the click or the conversion is the problem."
/>
```

### 5.3 Validation rules (added to `scripts/validate-lesson-production.ts`)

- Every `:::trade-off` requires `id`, `title`, ≥ 2 rows or ≥ 2 pairs.
- Every `:::process` requires `id`, `title`, ≥ 2 steps.
- Every `:::callout` requires `id`, `variant ∈ {info, warning, pitfall}`, non-empty body.
- Every `<SelfCheck>` requires `id`, `options.length ∈ [2,5]`, `answerIndex ∈ range`, `explanation` ≥ 12 chars.
- Block `id` is lesson-unique.
- All leaf text inside fences/tags passes the no-AI-slop regex used by `src/eslint-rules/no-ai-slop`.
- Validator stays non-blocking by default; `--strict` mode fails the build.

## 6. Renderer integration

File: `src/app/courses/[slug]/lessons/LessonContent.tsx` (extended, not rewritten). The current rendering pipeline is `react-markdown` + `remark-gfm`. The change:

1. If `remark-directive` is in `package.json` and `pnpm-lock.yaml`, add it to the `remarkPlugins` array and pass a `components` map for `:::trade-off`, `:::process`, `:::callout`.
2. Otherwise, implement a small inline remark plugin at `src/lib/mdx/directive-plugin.ts` that converts the three fences into directive nodes. Unit-tested in `tests/unit/mdx/directive-plugin.test.ts`.
3. `<SelfCheck>` JSX is already supported by the existing pipeline; just add it to the component map by name (PascalCase tag passes through `react-markdown`'s allowed tags when `unwrapDisallowed` is not set).

No change to:
- `Lesson.type` (still `TEXT | VIDEO | QUIZ`).
- The lesson page (`src/app/courses/[slug]/lessons/[lessonId]/page.tsx`).
- The component test (`LessonContent.test.tsx`), beyond extending fixtures.

## 7. State, accessibility, dependencies

State: SelfCheck is `'use client'` with `useState` only. Visual primitives are server components. Lesson completion, XP, and progress continue to flow through the existing use cases; SelfCheck is not a completion trigger.

Accessibility table (replicated from Section 3 of the brainstorm, made spec-grade):

| Component | Required behavior |
| --- | --- |
| SelfCheck | `role="radiogroup"`, options `role="radio"` with `aria-checked`, feedback `role="status"` + `aria-live="polite"`. Keyboard: arrow keys cycle, Enter activates, Tab to `Try again`. Color is never the only signal. |
| TradeOffTable | Native `<table>` with `<caption>`, `<thead>`, `<th scope="col">` (rectangular) or `<th scope="row">` (pairs). Long cells wrap inside 72ch. On `< 640px`, `overflow-x: auto` on a labelled wrapper. |
| ProcessDiagram | `<ol>` with each step's label descriptive. `aria-label="Lesson process steps"`. No icon-only meaning. |
| PitfallCallout | `<aside role="note">`. Title is `<h3>`. Icon decorative (`aria-hidden`). All variants pass WCAG AA against `--surface-0`, `--surface-1`. |

Focus ring: 2px `--accent`, 2px offset. Reduced motion: process diagram has no animation; self-check reveal uses a 120ms color transition only.

Dependencies: no new `package.json` entry unless `remark-directive` is already present. Hand-rolled parser otherwise.

## 8. Module 1 application

Five lessons get the new blocks. Existing copy is preserved; blocks slot in where they earn their keep.

| Lesson | New blocks |
| --- | --- |
| 1.1 Read PPC Data Before You Change PPC Data | 1 TradeOffTable (`big-six`); 1 PitfallCallout (`pitfall`, "Don't cut a bid on the first high ACoS"); 1 SelfCheck (max-CPC). |
| 1.2 CPC & CTR | 1 ProcessDiagram (`cpc-vs-ctr`); 1 TradeOffTable (CPC ↔ CTR — what each tells you); 1 SelfCheck. |
| 1.3 ACoS, TACoS, Profitability | 1 TradeOffTable (ACoS vs TACoS vs ROAS); 1 SelfCheck (numeric break-even). |
| 1.4 ROAS — Measuring Return | 1 PitfallCallout (`warning`, "ROAS without margin is decoration"); 1 SelfCheck. |
| 1.5 Metrics in Practice | 1 ProcessDiagram (`diagnostic-order`); 1 SelfCheck (full case, smallest safe action). |

Totals: 5 TradeOffTable, 4 ProcessDiagram, 4 PitfallCallout, 5 SelfCheck. No lesson exceeds 3 new blocks.

Each block has a unique `id` per lesson. Inline copy stays inside the voice guide.

## 9. Testing

### Unit (Vitest)

`src/components/lesson/__tests__/`:
- `SelfCheck.test.tsx` — initial state, wrong answer reveals explanation + Try again, right answer shows success path, Try again resets, keyboard and ARIA behavior.
- `TradeOffTable.test.tsx` — caption, headers, rows render; empty rows warn; pairs form renders key/value.
- `ProcessDiagram.test.tsx` — minimum 2 steps, ordered list, mobile wrap.
- `PitfallCallout.test.tsx` — variant selects correct icon/tone; decorative icon `aria-hidden`; color contrast per token.
- `a11y.test.tsx` — jest-axe zero violations WCAG AA for all four components.

`tests/unit/mdx/directive-plugin.test.ts`:
- Parses the three fence types from a fixture MDX string.
- Throws on malformed `:::trade-off` (no rows), `:::callout` (unknown variant), `<SelfCheck>` (`options.length` out of range).
- Slop regex hits inside fences/tags flagged.

`src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx` — extend:
- All three fences + `<SelfCheck>` render via the existing pipeline.
- Self-check interaction works inside the route.
- Malformed fences produce a clear error.

### End-to-end (Playwright)

`tests/e2e/lesson-blocks.spec.ts`:
- Enrolled learner opens Module 1 lesson 1.5.
- Reaches a `<SelfCheck>`, selects wrong, sees feedback, retries.
- Selects right, sees different feedback.
- Refreshes page, picks right again (state resets).
- Visual primitives render with correct roles/names.

### CI gates

- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm validate:curriculum`
- `pnpm validate:lesson-production`

Coverage thresholds (70% on `src/usecases`, `src/lib`, `src/domain`) continue to apply. New code paths in `src/components/lesson/` should land above 80% line coverage.

## 10. Files

```
NEW
src/components/lesson/
  SelfCheck.tsx
  SelfCheck.module.css
  TradeOffTable.tsx
  TradeOffTable.module.css
  ProcessDiagram.tsx
  ProcessDiagram.module.css
  PitfallCallout.tsx
  PitfallCallout.module.css
  index.ts
  __tests__/
    SelfCheck.test.tsx
    TradeOffTable.test.tsx
    ProcessDiagram.test.tsx
    PitfallCallout.test.tsx
    a11y.test.tsx
src/lib/mdx/
  directive-plugin.ts
tests/unit/mdx/
  directive-plugin.test.ts
tests/e2e/
  lesson-blocks.spec.ts
content/curriculum/
  AUTHORING.md
docs/stories/
  STORY-<next-available>-component-primitives.md
  STORY-<next-available+1>-module-1-active-pass.md

CHANGED
src/app/courses/[slug]/lessons/LessonContent.tsx
src/app/courses/[slug]/lessons/LessonContent.module.css
scripts/validate-lesson-production.ts
content/curriculum/modules/1-foundations/*.mdx
docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md
FEATURES.md
CHANGELOG.md
```

## 11. Definition of Done

A feature PR is shippable when:

1. All 4 component files + 4 CSS modules + 1 directive plugin + AUTHORING.md exist and pass review.
2. `pnpm test` passes with the new unit and a11y tests.
3. `pnpm tsc --noEmit` and `pnpm lint` pass.
4. `scripts/validate-lesson-production.ts` validates (non-strict: warns; strict: passes) every Module 1 lesson.
5. The Playwright E2E spec runs green in CI.
6. `pnpm validate:curriculum` and `pnpm validate:lesson-production` both pass.
7. `public-claims.json` is unchanged.
8. `FEATURES.md` and `CHANGELOG.md` updated for the new primitives.
9. `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` notes that LEARN-020's active-attempt contract now includes the visual/interactive blocks listed above.
10. Stories `STORY-<next-available>-component-primitives` and `STORY-<next-available+1>-module-1-active-pass` are created with matching `## Status` blocks set to `Planned` (then `Shipped` once merged). The exact IDs are chosen at PR-open time by listing the highest existing story ID under `docs/stories/`.

## 12. Story-link policy

Every PR that changes a student-facing component or lesson MUST in the same change:
- Update `docs/stories/STORY-XXX.md` `## Status` block.
- Update `FEATURES.md` status column.
- Update `CHANGELOG.md` with one-line entry per shipped concern.
- Update `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` only if a wave boundary shifts.

## 13. Rollout

After Module 1 ships, future PRs reuse the same authoring contract and validator for Modules 0, 2-8. Each becomes a separate ticket under the existing LEARN-02x sequence. The shared authoring guide (`content/curriculum/AUTHORING.md`) is updated if a new primitive is added; the renderer and validator stay stable.

## 14. Open questions deferred

- Analytics for self-check engagement (LEARN-060 + STORY-162). Out of this scope.
- Mid-lesson graded retrieval check (LEARN-040). Requires a port method and a `QuizAttempt` adapter; explicitly out.
- Saved learner artefacts (LEARN-033). Out.
- New simulator or new course/tier. Forbidden by AGENTS.md without separate design.
