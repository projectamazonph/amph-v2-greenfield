# STORY-165: Catalog survives a corrupt course row

**Sprint:** Reliability
**Points:** 3
**Epic:** Student experience
**Owner:** Ryan (TBD)

**Status:** Shipped. Production `https://projectamazonph.vercel.app/courses`
returned the "Courses unavailable" `db_error` fallback on every request while
`/api/health/ready` stayed 200 and the other two courses rendered fine. Diagnosed
from Vercel runtime logs (`[catalog:error]`) rather than by guessing, then fixed
in three parts: seed data, blast radius, and error masking.

## Goal

One unreadable row must not blank the public catalog, and a load failure must not
be reported to students or operators as a missing course.

## Root cause

`content/curriculum/modules/-1-amazon-and-ppc-job` carries `moduleNumber: -1`.
`scripts/seed-all-content.mjs` computed `displayOrder: moduleNumber + 1`, so that
module was persisted with `displayOrder: 0`. The `Module` factory requires a
1-indexed value (`src/domain/entities/Module.ts`), and
`PrismaModuleRepository.mapRow` refuses to hydrate an invalid row
(`src/infra/repositories/PrismaModuleRepository.ts`).

The row belongs to `ppc-foundations`, which is published, so
`ListCatalogCourses` enriched it and threw. The error surfaced as:

```
[catalog:error] catalog load failed { kind: 'db_error',
  message: 'Error: Module ef4fb0dc922e5f30dc200bdeeb9eea40 failed validation on read: invalid_input' }
```

`ef4fb0dc922e5f30dc200bdeeb9eea40` is `md5("module:ppc-foundations:-1")`.

`GetCatalogCourse` runs the same `findByCourseId`, which is why
`/courses/ppc-foundations` also failed. The detail page called `notFound()` for
every error, so the outage rendered as "Course Not Found" with HTTP 200, and
`/courses/zzz-not-a-real-course` returned 200 as well. Nothing in the response
distinguished a corrupt row from a typoed slug.

## Scope

### A. Seed data

`scripts/seed-all-content.mjs` now derives `displayOrder` from the course's own
module range instead of the global module number, via `COURSE_MODULE_RANGES` and
`moduleDisplayOrder()`. Module ids are unchanged (`md5("module:<slug>:<n>")`), so
the existing production row is corrected in place by the `upsert` on the next
production build, when `pnpm import:content` runs.

### B. Blast radius

`ListCatalogCourses` enriches each course independently and drops the ones that
fail. The result carries `skipped: readonly string[]`, and `/courses` logs a
`[catalog:error]` line naming the dropped slugs under the same tag the
full-failure branch uses, so one log filter catches both. `db_error` is still
returned when nothing at all loads, so a total outage does not degrade into the
"no courses yet" empty state.

### C. Error masking

`/courses/[slug]` renders a distinct "Course unavailable" state for `db_error`
and calls `notFound()` only for a genuine `not_found`. `generateMetadata` titles
the two cases "Course Unavailable" and "Course Not Found" separately, and the
page logs `[course:error]` for load failures.

## Acceptance checks

- `pnpm tsc --noEmit` clean.
- `pnpm lint` clean.
- `pnpm test` passes (one cold-start timeout in
  `src/app/signup/__tests__/page.test.tsx` passes in isolation; unrelated).
- `pnpm build` succeeds.
- New coverage: `ListCatalogCourses.test.ts` (partial module failure, partial
  lesson failure, all-fail still `db_error`, no `skipped` when clean) and
  `src/app/courses/[slug]/__tests__/page.test.ts` (the
  `if (!result.ok) notFound();` guard is gone, both metadata titles exist).

## Verification in production

1. Deploy. The production build runs `pnpm import:content`, which upserts
   `displayOrder: 1` for module -1.
2. `GET /courses` returns the catalog with three courses and no
   `[catalog:error]` line.
3. `GET /courses/ppc-foundations` renders the course instead of
   "Course Not Found".
4. `vercel logs --environment production --since 10m -x` shows
   `[catalog:info] catalog loaded: 3 course(s)`.

## Out of scope

- Clamping or repairing invalid rows inside `mapRow`. The repository docstring is
  explicit that a corrupt row must not silently hydrate; fixing the data keeps
  that guarantee.
- Migrating existing `displayOrder` values outside the seeder. There is no other
  writer of module `displayOrder`.
- Changing the `db_error` message shown to students. It stays developer-only and
  development-only on the catalog page.
- A `test -n "$DATABASE_URL"` preflight in `buildCommand`. Environment problems
  were ruled out for this incident (`/api/health/ready` was 200 throughout).
