# STORY-090 — Student quiz UI: access control + server action migration

**Status:** Deferred (not in this PRD scope)
**Owner:** Ryan Roland Dabao
**Sprint:** Sprint 6/7/9 completeness-gaps (US-001 + US-002)
**Depends on:** STORY-026 (Sprint 6 lesson delivery), STORY-031 (quiz domain)

---

## Overview

This story covers the student-facing quiz flow: ensuring only enrolled students (or admins) can reach a quiz page, and migrating the mutation off the legacy API route onto a Next.js server action per AGENTS.md Rule 4.

The PRD for the Sprint 6/7/9 completeness-gaps work ([`prd.md`](../../../.archon/ralph/sprints-6-7-9-completeness-gaps/prd.md)) included these as **US-001** and **US-002** in its 10-story scope, but the original user framing that drove the gap-identification was the **three administrative gaps**:

1. Admin quiz CRUD (STORY-091, US-003 to US-006) — _delivered_
2. Admin cert list/detail/revoke (STORY-092, US-007 to US-009) — _delivered_
3. Cert audit log gap (Architecture Note 6, surfaced in US-008) — _delivered_

The student-facing quiz UI was real but secondary to the three stated gaps. US-001 and US-002 are deferred to a future story / sprint to keep this PRD's scope aligned with the user's stated priorities.

## What this story would have shipped (deferred scope)

- **`src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx`** — add an `AuthorizeLessonAccess.execute({ userId, courseId, lessonId })` call mirroring the pattern in `src/app/courses/[slug]/lessons/[lessonId]/page.tsx:66-81`. Render `AccessDeniedPage` on `denied`; otherwise render `QuizPlayer` as today.
- **`src/app/actions/submitQuizAttempt.action.ts`** — new server action wrapping `RecordQuizAttempt`, including the same AuthorizeLessonAccess check.
- **`src/components/courses/QuizPlayer.tsx`** — switch from `fetch(POST /api/quizzes/${quizId}/attempt)` to `submitQuizAttempt(...)` via `useTransition`.
- **`src/app/courses/[slug]/lessons/LessonContent.tsx`** — `QuizContent` placeholder replaced with a link to the sibling quiz route.
- **Delete** `src/app/api/quizzes/[quizId]/attempt/route.ts` + `processQuizAttempt.ts` + their tests.
- **Unit + E2E tests** for the new server action and the access-control behavior.

## Current state (as of US-010 / 2026-07-27)

| File                                                      | Status                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx` | Loads quiz, renders `QuizPlayer`. **No AuthorizeLessonAccess.**          |
| `src/components/courses/QuizPlayer.tsx`                   | Uses `fetch(POST /api/quizzes/${quizId}/attempt)`.                       |
| `src/app/api/quizzes/[quizId]/attempt/route.ts`           | **Still exists** — should be deleted when US-002 lands.                  |
| `src/app/courses/[slug]/lessons/LessonContent.tsx`        | `QuizContent` still shows "Interactive quiz — coming soon!" placeholder. |
| `src/app/actions/submitQuizAttempt.action.ts`             | **Does not exist** — should be created when US-002 lands.                |

## Why deferred

- The user identified three administrative gaps as the priority; US-001 and US-002 are student-facing concerns and were not on that list.
- The student quiz flow is _functionally_ in place today (the QuizPlayer and API route work), just without the access-control gate and not on a server action. The security gap is real but contained: the API route does check `getSessionUser()` and the QuizPlayer would 401 on unauthenticated requests; what it doesn't check is enrollment (so a logged-in but not-enrolled student could potentially take a quiz if they know the URL).
- AGENTS.md Rule 4 violation (API route for a non-webhook mutation) is real but isolated to this single flow.

## Out of scope for US-010

US-010 (final integration) explicitly does not include US-001/US-002. The PR body for US-010 calls this out and links here for the audit trail. The PRD's dependency graph still lists US-010 as depending on US-002, but the dependency was never a hard blocker — US-010 is a wrap-up gate, not a deliverable that requires the student quiz flow to be remediated.

## Story numbers

- **STORY-090** (this file) — meta-story for US-001 + US-002.
- **STORY-091** — meta-story for US-003 to US-006 (admin quiz CRUD) — _delivered in PRs #219–#222_.
- **STORY-092** — meta-story for US-007 to US-009 (admin cert list/revoke) — _delivered in PRs #223–#225_.
