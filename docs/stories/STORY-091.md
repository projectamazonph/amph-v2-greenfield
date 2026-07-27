# STORY-091 — Quiz admin: list / create / edit / delete + nested question/option editor

Status: Done · Sprint: 6/7/9 completeness gap · Depends on: US-003, US-004, US-005

## Summary

Closes the "admin can't manage quizzes without SQL" gap by shipping the
full admin surface for quizzes: a list page, a create page, an edit
page with a nested question/option editor, and a delete action on the
edit page (with the has_attempts guard surfaced to the UI).

This story is the admin-facing half of the quiz CRUD trio:

- US-003 (`#219`) — repository: `update` / `delete` / `findAll` + the
  `order: index` bug fix.
- US-004 (`#220`) — use cases: `AdminListQuizzes`, `AdminGetQuiz`,
  `AdminCreateQuiz`, `AdminUpdateQuiz`, `AdminDeleteQuiz` (all with
  audit-log on every branch).
- US-005 (`#221`) — server actions: 5 thin pass-throughs with server-side
  admin gate and per-use-case error mapping.
- **STORY-091 (US-006, this PR)** — pages: `/admin/quizzes`,
  `/admin/quizzes/new`, `/admin/quizzes/[quizId]/edit`, plus a client
  component (`QuizEditor`) for the nested question/option editor.

## Pages shipped

| Path                           | Type   | Purpose                                                                                                 |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `/admin/quizzes`               | server | list every quiz, joined with parent course; "+ Add quiz" CTA                                            |
| `/admin/quizzes/new`           | server | form to create a quiz, course dropdown, nested question/option editor                                   |
| `/admin/quizzes/[quizId]/edit` | server | edit title/passing score + re-order/replace questions/options, with delete button in a Danger Zone card |

All three pages call `requireAdmin()` (the layout also does, but the
explicit call makes the page-level intent obvious) and render error
banners keyed by the `Result.error.kind` returned from the server
action, mapped through a per-page `ERROR_MESSAGES` table to
human-readable copy.

## Client components

- `src/components/admin/AdminQuizzesTable.tsx` — Astryx `Table` for the
  list page, same column-based pattern as `AdminBadgesTable`.
- `src/components/admin/QuizEditor.tsx` — nested editor: add/remove/
  reorder questions, add/remove options per question, exactly one
  correct answer per question (radio-button semantics). Serializes the
  current state to a hidden `questionsJson` form input on every change
  so the server action can consume it from a single `FormData`.

## Audit log

Every `Admin*` use case called by these pages (`#220`) already calls
`recordAuditLog` on success and on every error branch. The pages
themselves do NOT need to add audit calls — the use cases own the
audit contract. Verified via the unit tests in
`src/usecases/__tests__/Admin{List,Get,Create,Update,Delete}Quiz.test.ts`
(`assert(...) logs.some((l) => l.action === "quiz.*"))`).

## Self-checks

- **No cross-layer imports** in the new files. Pages import from
  `src/app/actions/*` (page → action → use case → port), client
  components import only React + `@astryxdesign/core`.
- **No `actorId` accepted from the client** — all 5 server actions
  inject `actorId` from the session inside the use case call. Grep
  the new `*.action.ts` files: `actorId` only appears server-side.
- **Every error kind handled at every call site** — the 3 page files
  each have an `ERROR_MESSAGES: Record<string, string>` table that
  covers every `*Error.kind` their action can return, including the
  one-of-each validation kind from `CreateQuizError`. No silent
  fallthrough.
- **Editor discipline** — `QuizEditor` writes a JSON-serialized snapshot
  to the hidden `questionsJson` field on every state change so the
  server action can reconstruct the full quiz structure from a single
  FormData (no multi-field encoding).
- **Empty-state copy** — the list page shows "No quizzes yet" instead
  of a blank table when the repo is empty.

## Tests

US-006 is a UI story, so the meaningful tests are the use-case unit
tests (already in `src/usecases/__tests__/Admin*Quiz.test.ts`, 27 tests
total) and the action tests (in `src/app/actions/__tests__/*Quiz*.test.ts`,
24 tests total). The page components themselves are not unit-tested
in this PR — they're thin server components and the editor is
isolated enough to rely on the manual smoke-test path; the existing
Playwright E2E suite (in US-010) will exercise the full flow.

## Out of scope (handled in later stories)

- US-002 (STORY-090) — student-facing quiz attempt flow + the
  `submitQuizAttempt` server action + removing the legacy API route.
  Different code path (LessonContent.tsx → /quiz page) and depends on
  US-001 not US-005.
- US-007 / US-008 / US-009 — certificate admin surface, parallel
  track.
- US-010 — final integration PR: E2E coverage of /admin/quizzes, the
  student quiz flow, the certificate admin flow, and the audit-log
  end-to-end check.

## Refs

- PRD: `.archon/ralph/sprints-6-7-9-completeness-gaps/prd.md` (US-006).
- Stories: US-003 (#219), US-004 (#220), US-005 (#221).
- Sibling meta-stories: STORY-090, STORY-092.
