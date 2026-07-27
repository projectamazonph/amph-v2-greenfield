# Close Sprint 6/7/9 Completeness Gaps — Product Requirements

## Overview

**Problem**: Three story files in `docs/stories/` are marked `Status: Done`, but the shipped code does not fully back the claim:

1. **STORY-026** (Sprint 6, Lesson Delivery) says QUIZ lessons render "a 'Quiz coming soon' placeholder card. Quiz interaction is STORY-032." A real quiz-taking flow was in fact built later (`src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx` + `QuizPlayer.tsx` + an API route), but `LessonContent.tsx` was never updated to link to it — students who click into a QUIZ lesson still hit the dead-end placeholder. Separately, the quiz route that *does* exist skips `AuthorizeLessonAccess` entirely, so any signed-in user (enrolled or not) can reach and submit any quiz if they know or guess the URL. And the mutation is implemented as a Next.js API route (`POST /api/quizzes/[quizId]/attempt`) rather than a server action, which violates AGENTS.md Rule 4 ("Server actions for mutations. Reserve API routes for webhooks, file uploads, third-party.").
2. **STORY-050 series** (Sprint 10, Admin panel) shipped admin CRUD for badges, courses, simulator scenarios, live classes, and discount codes (050a-050e) but never shipped an admin surface for quizzes. `docs/admin-backend.md` documents a *different*, narrower design (a JSON blob editor nested inside the module editor) that was also never built. Today there is no way for an admin to create, edit, or delete a quiz without writing SQL.
3. **STORY-041/043/044** (Sprint 9, Certificates) shipped the `Certificate` domain model, `IssueCertificate`, `VerifyCertificate` (public view), and `RevokeCertificate` + its server action — but no admin surface to list issued certificates or drive the existing revoke action from a UI. `ICertificateRepository` also has no method to list all certificates (only `findByUserId`), so an admin list view cannot be built without a port change.

**Solution**: Close all three gaps with real, tested, audited code — not by editing the story files to sound more honest, but by shipping the missing feature in each case. Each of the three deliverables below closes one gap, gets its own `docs/stories/STORY-09X.md`, and lands together in one PR.

**Branch**: `ralph/sprints-6-7-9-completeness-gaps`

---

## Goals & Success

### Primary Goal

An enrolled student can take a quiz end-to-end from the lesson page with proper access control; an admin can fully manage quizzes (create/edit/delete, with nested questions and options) without touching the database directly; an admin can see and revoke issued certificates from a UI.

### Success Metrics

| Metric | Target | How Measured |
|---|---|---|
| Quiz placeholder removed | 0 occurrences of "coming soon" quiz copy reachable from a lesson page | Manual + E2E click-through |
| Quiz access control | Non-enrolled user cannot start/submit a quiz outside preview lessons | New unit/E2E test asserting `denied` |
| Admin quiz CRUD | Admin can create a quiz with 2+ questions (each with exactly one correct option), edit it, and delete it, entirely via `/admin/quizzes/*` | E2E flow + unit tests on new use cases |
| Admin certificates | Admin can list all issued certificates, open one, and revoke it with a reason, and the revocation is audit-logged | E2E flow + unit test on new use cases |
| No regressions | `pnpm tsc --noEmit && pnpm lint && pnpm test && pnpm test:coverage && pnpm build` all green | CI |
| Every admin write is audited | Every new `Admin*Quiz*`/certificate-revoke code path calls `recordAuditLog` on success **and** failure | Code review + unit test assertions on `IAuditLog` fake calls |

### Non-Goals (Out of Scope)

- Rewriting the quiz scoring/domain logic (`Quiz.ts`, `QuizAttempt.ts`, `RecordQuizAttempt.ts`) — these already exist and are correct per STORY-031. This PRD only wires the UI, closes the access-control gap, and migrates the mutation to a server action.
- Soft-delete/archive semantics for quizzes — the task explicitly asks for "delete," matching the existing `DeleteModule` hard-delete pattern, not `AdminArchiveBadge`'s soft archive.
- Cascading/blocking behavior for `QuizAttempt` rows when a `Quiz` is deleted beyond a simple guard — see STORY-092 acceptance criteria for the minimum bar (block delete if attempts exist); a full reconciliation strategy is future work.
- Re-issuing a certificate after revocation, or a "re-issue" admin action — STORY-041 explicitly deferred this; still out of scope here.
- Updating `docs/build-spec.md`'s aspirational `Container` shape — only `docs/admin-backend.md` needs a factual update (documenting the new `/admin/quizzes` and `/admin/certificates` surfaces).
- Any change to `PayMongo`, refunds, or the simulator engines — unrelated subsystems.

---

## User & Context

### Target User

- **Student** (Filipino VA taking the PPC course): mid-lesson, hits a QUIZ-type lesson, expects to take the quiz and see their score/pass-fail/XP immediately, same as they already can for TEXT/VIDEO lessons.
- **Admin** (single solo-developer/operator role, `role === "ADMIN"`): needs to author quiz content without SQL access, and needs to handle a certificate dispute/error (wrong course completion, fraud, refund-triggered revocation not caught by the automatic path) by revoking a cert with a stated reason.

### User Journey

**Student (quiz)**
1. **Trigger**: Student reaches a QUIZ-type lesson inside an enrolled (or preview-eligible) course.
2. **Action**: Clicks "Start Quiz" from the lesson content area → answers each question → submits.
3. **Outcome**: Sees score, pass/fail, and XP awarded (if passed); denied with a clear message if not enrolled and past the preview limit.

**Admin (quiz editor)**
1. **Trigger**: New course module needs a quiz, or an existing quiz has a typo/wrong answer.
2. **Action**: Goes to `/admin/quizzes`, filters by course, clicks "+ Add quiz" or "Edit" on an existing row, fills in title/passing score/questions/options (exactly one correct option per question), saves.
3. **Outcome**: Quiz is created/updated and immediately available to students in that course; every write is audit-logged.

**Admin (certificates)**
1. **Trigger**: A student disputes a certificate, or an admin is auditing issued certs after a refund.
2. **Action**: Goes to `/admin/certificates`, finds the cert by user/course, opens the detail view, enters a revocation reason, submits.
3. **Outcome**: Certificate flips to `revoked`, the public verification page (STORY-043) reflects it, and an audit log entry records who revoked it and why.

---

## UX Requirements

### Interaction Model

Server-rendered pages (Next.js App Router, server components by default) + server actions for every mutation. No new API routes (mutations go through server actions per AGENTS.md Rule 4). Quiz-taking UI stays a client component (`QuizPlayer.tsx`) since it needs local per-question state; admin quiz editor's nested question/option form is also a client component for the same reason.

### States to Handle

| State | Description | Behavior |
|---|---|---|
| Empty | No quizzes exist for a course / no certificates issued yet | `/admin/quizzes` and `/admin/certificates` list pages show an empty-state row/card, not a blank table |
| Loading | N/A for server components (data is fetched before render); client quiz submission shows a disabled "Submitting..." button state (already implemented in `QuizPlayer.tsx`) |
| Denied / not enrolled | Student hits quiz page/action without an active enrollment past the preview limit | Quiz page renders the same `AccessDeniedPage` component already used by the TEXT/VIDEO lesson page (`src/app/courses/[slug]/lessons/[lessonId]/page.tsx`) |
| Error (validation) | Admin submits a quiz with a question missing a correct option, or a certificate revoke with an empty reason | Form re-renders with an inline error banner keyed by the `Result.error.kind`, same pattern as `/admin/badges/new` |
| Success | Quiz created/updated/deleted; certificate revoked | Redirect to the list/detail page with a success banner via search param, same pattern as `/admin/refunds/[orderId]` |

---

## Technical Context

### Patterns to Follow

- **Student server action (auth guard → container → use case → flatten Result)**: `src/app/actions/submitSimulatorAttempt.action.ts` (full file, 65 lines) — mirror this shape for the new `submitQuizAttempt.action.ts`.
- **Existing quiz UI to wire up, not rebuild**: `src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx` (68 lines, server component, loads quiz via `container.quizRepo.findById(lessonId)` — note the existing convention that `lessonId` doubles as `quizId`), `src/components/courses/QuizPlayer.tsx` (162 lines, client, currently does `fetch(POST /api/quizzes/${quizId}/attempt)`).
- **Access-control gate to add**: `src/usecases/AuthorizeLessonAccess.ts` (126 lines) — the only existing caller is `src/app/courses/[slug]/lessons/[lessonId]/page.tsx:66-81`. Mirror that exact call shape in the quiz page and in `submitQuizAttempt.action.ts`.
- **Admin list/create/edit CRUD**: `src/app/admin/badges/page.tsx`, `src/app/admin/badges/new/page.tsx`, `src/app/admin/badges/[slug]/edit/page.tsx` (full files already read) — `requireAdmin()` first line, `buildContainer()`, dedicated `Admin*` use case per operation, client table component fed serializable rows, inline `"use server"` form actions with redirect-based error/success feedback.
- **Hard-delete admin use case (not soft-archive)**: `src/usecases/DeleteModule.ts` (33-81) — find-first, `repo.delete(id)`, audit-log on both failure paths and success. Use this shape for `AdminDeleteQuiz`, not `AdminArchiveBadge`'s soft-archive shape.
- **Admin use case with audit log on every path**: `src/usecases/AdminCreateBadge.ts` (full file, 87 lines) — options-object constructor deps, closed `kind`-discriminated error union, `recordAuditLog` called on every failure branch and on success.
- **Admin server action (actorId injected from session, never from client)**: `src/app/actions/createBadge.action.ts` (33 lines) — `requireAdmin()` → `buildContainer()` → `container.<useCase>.execute({...input, actorId: session.id})` → map `Result` to `{ok:true,...}|{ok:false,error:string}`. The client-facing input type has no `actorId` field at all.
- **Admin list+detail+mutating-action surface (closest analog to certificates)**: `src/app/admin/refunds/page.tsx` (194 lines, dedicated `AdminList*`-style use case + client table) and `src/app/admin/refunds/[orderId]/page.tsx` (239 lines, inline `"use server"` action wired to a plain `<form>`, redirect-with-searchParam feedback).
- **Revoke-with-reason + audit log pattern**: `src/usecases/RefundOverride.ts` (129 lines) — mandatory `reason`/`overrideReason` fields, `recordAuditLog` call with a `metadata` object capturing the reason.
- **Batch-hydrating a list of domain records with related User/Course data**: `src/usecases/ListRefundRequests.ts:76-88` (dedupe ids via `Set`, loop `findById`, build a `Map`) and `src/usecases/VerifyCertificate.ts` (single-record User+Course join, for the detail-page analog) and `src/usecases/AdminGetPayment.ts` (single-record join, exact template for `AdminGetCertificate`).
- **Repository `listAll` port method precedent**: `src/ports/repositories/OrderRepository.ts:27-32` — `listAll(filters?: { status?: PaymentStatus }): Promise<Result<Order[], OrderError>>`, sorted `createdAt desc`. Mirror exactly for `ICertificateRepository.listAll`.
- **Existing, already-wired revoke server action**: `src/app/actions/revokeCertificate.action.ts` (160 lines) — auth + role check + reason validation + `container.revokeCertificate.execute({..., revokedBy: sessionUser.id})`. **Reuse this directly from the new admin detail page's form** rather than writing a new action; only add the missing `recordAuditLog` call (see Architecture Notes).

### Types & Interfaces

```typescript
// src/domain/entities/Quiz.ts — existing, do not change signatures
export interface QuizOption { readonly id: string; readonly optionText: string; readonly isCorrect: boolean; }
export interface QuizQuestion { readonly id: string; readonly questionText: string; readonly options: readonly QuizOption[]; }
export interface Quiz {
  readonly id: string; readonly courseId: string; readonly title: string;
  readonly passingScore: number; // 0-100
  readonly questions: readonly QuizQuestion[];
}
export function createQuiz(params: {
  id: string; courseId: string; title: string; passingScore: number;
  questions: { id: string; questionText: string; options: { id: string; optionText: string; isCorrect: boolean }[] }[];
}): Result<Quiz, CreateQuizError>;
// No updateQuiz helper exists today — AdminUpdateQuiz must reconstruct the whole
// aggregate via createQuiz(...) and re-run full validation (replace-whole-aggregate
// strategy, same as RebuildCourseCurriculum).

// src/ports/repositories/IQuizRepository.ts — CURRENT (3 methods only)
export type QuizRepositoryError = { kind: "db_error"; message: string };
export interface IQuizRepository {
  create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>>;
  findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>>;
  findByCourseId(courseId: string): Promise<Result<readonly Quiz[], QuizRepositoryError>>;
}
// MUST ADD (this PRD): update, delete, findAll + a "not_found" error kind.
// Stays well under the port-segregation.test.ts 12-method ISP cap (3 -> 6).

// src/ports/repositories/ICertificateRepository.ts — CURRENT (5 methods, no listAll)
export type CertificateRepositoryError = { kind: "not_found" } | { kind: "db_error"; message: string };
export interface ICertificateRepository {
  create(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>>;
  findById(id: string): Promise<Result<Certificate | null, CertificateRepositoryError>>;
  findByVerificationHash(hash: string): Promise<Result<Certificate | null, CertificateRepositoryError>>;
  findByUserId(userId: string): Promise<Result<readonly Certificate[], CertificateRepositoryError>>;
  update(cert: Certificate): Promise<Result<Certificate, CertificateRepositoryError>>;
}
// MUST ADD (this PRD): listAll(filters?: { status?: CertificateStatus }): Promise<Result<readonly Certificate[], CertificateRepositoryError>>

// src/usecases/RecordQuizAttempt.ts — existing, do not change
export type RecordQuizAttemptInput = {
  userId: string; quizId: string;
  answers: ReadonlyArray<{ questionId: string; selectedOptionId: string }>;
};
export type RecordQuizAttemptResult = Result<
  { attempt: QuizAttempt; score: number | null; passed: boolean | null; xpAwarded: number },
  RecordQuizAttemptError
>;

// src/usecases/RevokeCertificate.ts — existing, do not change
export interface RevokeCertificateInput { certificateId: string; reason: string; revokedBy: string; }
export type RevokeCertificateResult = Result<
  { certificate: Certificate; wasAlreadyRevoked: boolean },
  RevokeCertificateError
>;
```

### Architecture Notes

1. **Quiz access control** — `AuthorizeLessonAccess` takes `{ userId, courseId, lessonId }` and returns `{ kind: "allowed" } | { kind: "allowed_preview"; previewLessonCount } | { kind: "denied"; reason }`. The quiz page/action needs `courseId`, which the current quiz page doesn't load — it must be looked up via `quiz.courseId` (already on the `Quiz` entity) or by loading the parent course the same way the TEXT/VIDEO lesson page does. Treat `"denied"` the same way `[lessonId]/page.tsx:66-81` does: render `AccessDeniedPage`. Admin users bypass via the existing rule inside `AuthorizeLessonAccess` itself (no special-casing needed in the page).
2. **API route → server action migration** — `src/app/api/quizzes/[quizId]/attempt/route.ts` + `processQuizAttempt.ts` currently implement the mutation. AGENTS.md Rule 4 reserves API routes for webhooks/uploads/third-party. Add `src/app/actions/submitQuizAttempt.action.ts` wrapping `RecordQuizAttempt` (plus the `AuthorizeLessonAccess` check), point `QuizPlayer.tsx` at it via `startTransition`/`useTransition` instead of `fetch`, and remove the now-unused API route + its tests. Do not change `RecordQuizAttempt` itself.
3. **`PrismaQuizRepository.create()` order bug** — `order: 0` is hardcoded for every question/option row (`PrismaQuizRepository.ts:32,43`) instead of the array index. This must be fixed as part of adding `update()`, or reordering in the nested admin editor will silently not persist. Fix by assigning `order: index` when writing questions/options in both `create` and the new `update`.
4. **`AdminUpdateQuiz` / delete strategy** — no `updateQuiz` domain helper exists. Reconstruct the full `Quiz` via `createQuiz(...)` with edited fields, then have `PrismaQuizRepository.update()` do a delete-and-recreate of child `QuizQuestion`/`QuizOption` rows inside a Prisma transaction (`prisma.$transaction`) to avoid partial writes — mirrors the cascade-delete relations already declared in the schema (`onDelete: Cascade` on both child models). `AdminDeleteQuiz` must guard: if any `QuizAttempt` rows reference the quiz, block the delete with a `has_attempts` error kind (no cascade path exists for `QuizAttempt.quizId`, which has no FK/relation declared in the schema) rather than silently orphaning attempt rows.
5. **New `AuditAction` entries** — `src/domain/values/AuditAction.ts` has zero `quiz.*` or `certificate.*` entries today. Add to both the type union and the `ALL_ACTIONS` array (required for the `isAuditAction` type guard and the admin audit-log filter dropdown to recognize them): `quiz.created`, `quiz.updated`, `quiz.deleted`, `quiz.create_failed`, `quiz.update_failed`, `quiz.delete_failed`, `certificate.revoked`.
6. **Certificate revoke audit-log gap** — `RevokeCertificate.ts` deliberately does not call `recordAuditLog` (STORY-044's design: caller's responsibility), and `revokeCertificate.action.ts` (already shipped) also never calls it — so today, revoking a certificate leaves **no audit trail**. Close this by adding a `recordAuditLog` call inside `revokeCertificate.action.ts` itself (it already has `buildContainer()` and the session user), using action `"certificate.revoked"`, `targetType: "certificate"`, `targetId: certificateId`, `metadata: { reason, courseId, userId }`. Do this on the success path; on the `RevokeCertificate.execute` error paths, log a `*_failed`-style entry is optional here since `RevokeCertificateError` kinds (`certificate_not_found`, `invalid_reason`, etc.) are input-validation errors surfaced directly to the admin form, not the security-relevant event — but do log on success unconditionally including the `wasAlreadyRevoked: true` idempotent-replay case, since that's still an admin action worth a trail entry.
7. **Certificate list hydration** — `Certificate` carries only `userId`/`courseId` (STORY-041 design: no embedded User/Course). `AdminListCertificates` must batch-hydrate via two `Map`s (`Map<string, User>`, `Map<string, Course>`) built by deduping ids with a `Set` then looping `userRepo.findById`/`courseRepo.findById` — same technique as `ListRefundRequests.ts:76-88`. `AdminGetCertificate` (detail view) does a single-record version of the same join, mirroring `AdminGetPayment.ts`.
8. **`docs/admin-backend.md` update** — currently documents quiz editing as a JSON blob nested in the module editor (`admin-backend.md:160-166`), which was never built and is superseded by this PRD's dedicated `/admin/quizzes` surface. Update that section to describe the real, shipped design, and add a row for `/admin/certificates` to the "What Lives Where" table. This is a documentation-accuracy fix, not a design decision to relitigate.
9. **No new ports beyond the two repository method additions above** — `IQuizRepository` and `ICertificateRepository` gain methods but no new port interfaces are introduced; `RecordQuizAttempt`, `AuthorizeLessonAccess`, `RevokeCertificate`, `IssueCertificate`, `VerifyCertificate` are all reused unmodified.

---

## Implementation Summary

### Story Overview

| ID | Title | Priority | Dependencies |
|---|---|---|---|
| US-001 | Quiz page: enforce AuthorizeLessonAccess + wire lesson placeholder | 1 | — |
| US-002 | Quiz mutation: server action migration + QuizPlayer wiring + STORY-090 doc | 2 | US-001 |
| US-003 | Quiz repo: add update/delete/findAll + fix order bug | 3 | — |
| US-004 | Quiz admin use cases + audit actions + container wiring | 4 | US-003 |
| US-005 | Quiz admin server actions | 5 | US-004 |
| US-006 | Quiz admin pages (list/create/edit, nested question/option editor) + STORY-091 doc | 6 | US-005 |
| US-007 | Certificate repo: add listAll | 7 | — |
| US-008 | Certificate admin use cases + audit-log fix + container wiring | 8 | US-007 |
| US-009 | Certificate admin pages (list/detail/revoke) + STORY-092 doc | 9 | US-008 |
| US-010 | Final integration: full validation, self-check, single PR | 10 | US-002, US-006, US-009 |

### Dependency Graph

```
US-001 (quiz access control)
    |
US-002 (quiz action + UI wiring, STORY-090)
    |
    |         US-003 (quiz repo CRUD methods)
    |             |
    |         US-004 (quiz admin use cases + audit + wiring)
    |             |
    |         US-005 (quiz admin actions)
    |             |
    |         US-006 (quiz admin pages, STORY-091)
    |             |
    |         US-007 (cert repo listAll)
    |             |
    |         US-008 (cert admin use cases + audit fix + wiring)
    |             |
    |         US-009 (cert admin pages, STORY-092)
    |             |
    +-------------+
                  |
              US-010 (final integration, PR)
```

Note: US-003..US-009 are written as sequential priorities for a single Ralph loop lane, but US-003/US-007 (repo layer changes for quizzes vs certificates) have no dependency on US-001/US-002 (student quiz UI) and could run in parallel lanes if the loop runner supports it. `dependsOn` in `prd.json` reflects only true dependencies (each layer needs its own prior layer), not the arbitrary priority ordering.

---

## Validation Requirements

Every story must pass:
- [ ] Type-check: `pnpm tsc --noEmit`
- [ ] Lint: `pnpm lint`
- [ ] Tests: `pnpm test`
- [ ] Coverage: `pnpm test:coverage` (80% lines, 70% branches, 80% functions, 80% statements)
- [ ] Build: `pnpm build`

Final story (US-010) additionally runs:
- [ ] `pnpm test:e2e`
- [ ] Self-check: no cross-layer imports introduced (`src/domain`/`src/usecases`/`src/ports` importing `next`/`@prisma/client`/etc.)
- [ ] Self-check: no `Result` value imported as a type-only import (or vice versa) anywhere touched
- [ ] Self-check: `actorId` is never accepted as a field on a client-facing action input type — grep every new/changed `*.action.ts` for `actorId` appearing only on the server side of the call
- [ ] Self-check: every new `Admin*` use case calls `recordAuditLog` on every error branch and the success branch
- [ ] Self-check: every new discriminated union (`*Error` types) has every `kind` handled at each call site (page/action), no silent fallthrough
- [ ] `docs/stories/STORY-090.md`, `STORY-091.md`, `STORY-092.md` written matching the STORY-031/STORY-041/STORY-050b template shape
- [ ] `docs/admin-backend.md` updated per Architecture Note 8
- [ ] Single PR opened against `main` referencing STORY-090, STORY-091, STORY-092

---

*Generated: 2026-07-27T00:00:00Z*
