# STORY-090 — Live-class list page

**Type:** feat
**Pts:** 1
**Status:** Done

## Why

`docs/STUDENT-FEATURE-GAP-ANALYSIS.md` identified the live-class student experience as the second-largest student-facing gap. Admins could schedule live classes (`/admin/live-classes/...`) and the `SendLiveClassReminders` cron emailed students, but no student-facing list page existed. This is the first half of the gap fix.

## What changed

- `src/app/live-classes/page.tsx` — new server component. Reads from `listLiveClassesForStudent`, which joins live classes with the student's active enrollments and current RSVP state.
- `src/app/live-classes/loading.tsx` — loading skeleton (required by AGENTS.md "loading.tsx required on every page directory").
- `src/app/live-classes/page.module.css` — Field Manual tokens. Edge-to-edge row layout, no Card wrapper around the list.
- `src/usecases/ListLiveClassesForStudent.ts` — new use case. Joins three ports (LiveClassRepository, LiveClassRegistrationRepository, EnrollmentRepository). Returns empty for non-enrolled users.
- `src/domain/entities/LiveClassRegistration.ts` — new domain entity. Pure factory + helpers. `Result` for validation errors.
- `src/ports/repositories/ILiveClassRegistrationRepository.ts` — new port.
- `src/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository.ts` — fake adapter for tests and the production container (until the Prisma adapter lands).
- `src/composition/container.ts` — wires the new use case + the in-memory registration repo.
- `src/composition/container.test.ts` — same wiring for `buildTestContainer()`.
- `prisma/migrations/20260801000000_live_class_registration/` — new migration for the `live_class_registrations` table. Cascades on user and live_class delete.
- `prisma/schema.prisma` — `LiveClassRegistration` model + relation to `User` and `LiveClass`.

## Acceptance Criteria

- [x] `/live-classes` returns 200 for any authenticated user.
- [x] Empty list (or empty-state) when the student is not enrolled.
- [x] Class rows show date, time, duration, title, and an RSVP status badge.
- [x] Sorted by nearest `scheduledAt` first.
- [x] Past or cancelled classes are excluded.
- [x] `loading.tsx` exists (skeleton coverage target).
- [x] Tests cover: empty enrollment, future-only filtering, sort order, and RSVP attachment.

## Files touched

- New: `src/app/live-classes/page.tsx`, `page.module.css`, `loading.tsx`
- New: `src/domain/entities/LiveClassRegistration.ts`
- New: `src/ports/repositories/ILiveClassRegistrationRepository.ts`
- New: `src/infra/repositories/inmemory/InMemoryLiveClassRegistrationRepository.ts`
- New: `src/usecases/ListLiveClassesForStudent.ts`
- New: `src/usecases/__tests__/ListLiveClassesForStudent.test.ts`
- New: `prisma/migrations/20260801000000_live_class_registration/migration.sql`
- Modified: `prisma/schema.prisma`
- Modified: `src/composition/container.ts`
- Modified: `src/composition/container.test.ts`

## Pitfalls

- The in-memory registration repo is the production adapter for now because there is no `PrismaLiveClassRegistrationRepository.ts` yet. AGENTS.md "Don't" rule 12 ("Don't mock the real Prisma client in tests") still holds — the production container wires the in-memory fake rather than mocking. A Prisma adapter is the natural follow-up.

## Verification

- `pnpm test src/usecases/__tests__/ListLiveClassesForStudent.test.ts`
- `pnpm tsc --noEmit`
- Manual: log in as an enrolled student, visit `/live-classes`, see upcoming sessions and the RSVP status badge.