# STORY-048a: Admin courses CRUD (no modules/lessons editing yet)

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-046 (admin shell), STORY-047 (admin users list pattern)
**Blocks:** STORY-048b (modules CRUD + reorder), STORY-048c (lessons CRUD + MDX editor)
**Status:** ✅ Done (PR #048a, commit `0a038f9` — `feat(admin): STORY-048a admin courses CRUD (no modules/lessons editing yet)`; `src/app/admin/courses/` lives)

## Goal

Ship the course-level admin surface. After this story:

- `/admin/courses` — list of all courses (DRAFT, PUBLISHED, ARCHIVED). Search by title/slug, filter by status.
- `/admin/courses/new` — create a new course (DRAFT by default).
- `/admin/courses/[id]` — view a course (read-only for now).
- `/admin/courses/[id]/edit` — edit a course.
- `/admin/courses/[id]/archive` — archive a course (soft delete; sets `status: ARCHIVED`).
- "Archive" button in the course list with a confirmation step.
- "Modules" and "Lessons" tabs/sections on the edit page are **placeholders** ("Coming in STORY-048b/c"). The pages render but the editing surfaces do not exist yet.

## Why

This is the first of three stories that together make up the original STORY-048 from the sprint plan. Splitting per the plan's own "When a Story Splits" rule (Code shape > ~150 lines = split). The original 1-pt story was ~3 stories worth of work:

| Story | Scope | Realistic effort |
|-------|-------|-----------------|
| **STORY-048a (this)** | Course CRUD, no curriculum editing | 1-1.5 hours |
| **STORY-048b** | Module entity + admin modules CRUD + reorder | 1.5-2 hours |
| **STORY-048c** | Lesson entity + admin lessons CRUD + MDX editor | 2-3 hours |

This story ships the highest-leverage part (course-level CRUD) without blocking on the curriculum model. STORY-048b and -c can land in their own PRs without rewriting 048a.

## Acceptance Criteria

### Domain + port extensions

- [ ] `src/domain/entities/Course.ts` — add `updateCourse` factory:
  - Takes the existing `Course` + a patch (Partial<{...course fields, except id/createdAt/curriculum...}>)
  - Returns `Result<Course, CreateCourseError>` (reuses the existing error union)
  - Validates the patch (slug, price, etc.) via the same rules as `createCourse`
- [ ] `src/ports/repositories/CourseRepository.ts` — add three methods:
  - `create(course: Course): Promise<Result<Course, CourseError>>` (returns `slug_taken` if a course with the same slug exists)
  - `update(course: Course): Promise<Result<Course, CourseError>>` (returns `not_found` if id doesn't exist; `slug_taken` if the slug collides with another course)
  - `archive(id: string): Promise<Result<Course, CourseError>>` (soft delete: sets status=ARCHIVED; returns the archived course; returns `not_found` if id doesn't exist)

### Infra adapters

- [ ] `src/infra/repositories/InMemoryCourseRepository.ts` — implement the 3 new methods (slug uniqueness enforced in the Map)
- [ ] `src/infra/repositories/PrismaCourseRepository.ts` — implement the 3 new methods via Prisma (no `any` casts; use `Prisma.CourseGetPayload<{}>`)

### Use cases (all TDD)

- [ ] `src/usecases/AdminListCourses.ts` — list with search + status filter
  - Input: `{ search?: string; status?: CourseStatus; page?: number; pageSize?: number }`
  - Output: `{ courses: readonly Course[]; totalCount: number; page: number; pageSize: number }`
  - Defaults: page=1, pageSize=25; pageSize capped at 100
- [ ] `src/usecases/AdminGetCourse.ts` — get a course by id (admin view, no status filter)
  - Input: `{ courseId: string }`
  - Output: `{ course: Course }`
  - Returns `course_not_found` if missing
- [ ] `src/usecases/CreateCourse.ts` — admin creates a new course
  - Input: `{ id: string; slug: string; title: string; tagline: string; description: string; priceMinor: number; courseTier: CourseAccessTier; previewLessonCount: number; isFeatured: boolean; displayOrder: number; coverImage: string | null; status: CourseStatus; defaultCurriculum: { sectionTitle: string; lessonTitle: string } }`
  - Output: `{ course: Course }`
  - Generates a placeholder curriculum with one section + one lesson using the `defaultCurriculum` titles (so the course passes the `isValidCurriculum` check). The admin can replace it in STORY-048b/c.
  - Returns the same errors as `createCourse` (`invalid_slug`, `invalid_price`, `invalid_curriculum`) + repo errors (`slug_taken`, `db_error`)
- [ ] `src/usecases/UpdateCourse.ts` — admin updates an existing course
  - Input: `{ courseId: string; patch: Partial<{...same as createCourse input...}> }`
  - Output: `{ course: Course }`
  - Validates the resulting course (slug, price, etc.)
  - Returns `course_not_found` if id missing; `slug_taken` if slug collides; validation errors otherwise
- [ ] `src/usecases/ArchiveCourse.ts` — admin archives a course
  - Input: `{ courseId: string }`
  - Output: `{ course: Course }` (the archived course with status=ARCHIVED)
  - Returns `course_not_found` if missing
  - Idempotent: archiving an already-ARCHIVED course returns the same result (no error)
  - For now, ARCHIVED is terminal. STORY-048b may add "un-archive" (DRAFT).

### Tests

- [ ] `src/usecases/__tests__/AdminListCourses.test.ts` — search, status filter, pagination, combinations
- [ ] `src/usecases/__tests__/AdminGetCourse.test.ts` — happy path, not found, db_error
- [ ] `src/usecases/__tests__/CreateCourse.test.ts` — happy path, invalid_slug, invalid_price, slug_taken, db_error, default curriculum has 1 section + 1 lesson
- [ ] `src/usecases/__tests__/UpdateCourse.test.ts` — happy path, partial updates, course_not_found, slug_taken, invalid_slug, invalid_price
- [ ] `src/usecases/__tests__/ArchiveCourse.test.ts` — happy path, not found, idempotent on already-archived
- [ ] `src/infra/repositories/__tests__/InMemoryCourseRepository.test.ts` — slug uniqueness, create/update/archive behavior, listAll ordering (NEW test file — covers the 3 new methods that have no coverage today)

### Server actions

- [ ] `src/app/actions/createCourse.action.ts` — thin shell + `performCreateCourse` helper
  - Auth: `requireAdmin` (verified by helper via injected `getCurrentUser`)
  - Returns the same error union as the use case
- [ ] `src/app/actions/updateCourse.action.ts` — thin shell + `performUpdateCourse` helper
- [ ] `src/app/actions/archiveCourse.action.ts` — thin shell + `performArchiveCourse` helper
  - Idempotent at the action layer too (always returns success if the course is or becomes ARCHIVED)

### Pages

- [ ] `src/app/admin/courses/page.tsx` — list view
  - TopBar: "Courses" + "Add course" button (links to `/admin/courses/new`)
  - Filter row: search + status select
  - Table: title, slug, status badge, tier, price (formatted PHP), lesson count, created date
  - Each row: link to `/admin/courses/[id]`
  - Pagination
- [ ] `src/app/admin/courses/new/page.tsx` — create form
  - Fields: title, slug, tagline, description, price (PHP), course tier, preview lesson count, isFeatured, displayOrder, coverImage URL
  - "Status" defaults to DRAFT; admin can choose PUBLISHED on creation
  - Submit button: "Create course" (server action)
  - Back link to `/admin/courses`
- [ ] `src/app/admin/courses/[id]/page.tsx` — read-only detail
  - Shows the course details
  - "Edit" button (links to `/admin/courses/[id]/edit`)
  - "Archive" button (form posting to the archive action, with confirm)
  - **Modules / Lessons sections are placeholders** ("Coming in STORY-048b / STORY-048c")
- [ ] `src/app/admin/courses/[id]/edit/page.tsx` — edit form
  - Same fields as new, pre-populated
  - Submit button: "Save changes" (server action)
  - "Modules / Lessons" tabs are placeholders

### Container wiring

- [ ] `src/composition/container.ts` — add `adminListCourses`, `adminGetCourse`, `createCourse`, `updateCourse`, `archiveCourse` to `AppContainer`
- [ ] `src/composition/container.test.ts` — same in the test container

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 1007 + new tests passing
- [ ] `pnpm build` succeeds (or `tsc + vitest` if the pre-existing `InMemoryEmailSender` build break still exists)

## Files to Create

```
src/usecases/
├── AdminListCourses.ts
├── AdminGetCourse.ts
├── CreateCourse.ts
├── UpdateCourse.ts
├── ArchiveCourse.ts
└── __tests__/
    ├── AdminListCourses.test.ts
    ├── AdminGetCourse.test.ts
    ├── CreateCourse.test.ts
    ├── UpdateCourse.test.ts
    └── ArchiveCourse.test.ts

src/infra/repositories/__tests__/
└── InMemoryCourseRepository.test.ts   (NEW)

src/app/actions/
├── createCourse.action.ts
├── updateCourse.action.ts
└── archiveCourse.action.ts

src/app/admin/courses/
├── page.tsx
├── page.module.css
├── new/
│   ├── page.tsx
│   └── page.module.css
└── [id]/
    ├── page.tsx
    ├── page.module.css
    ├── edit/
    │   ├── page.tsx
    │   └── page.module.css
    └── __tests__/
        └── page.test.tsx  (optional, see Pitfalls)
```

## Files to Modify

- `src/domain/entities/Course.ts` — add `updateCourse` factory
- `src/ports/repositories/CourseRepository.ts` — add `create`, `update`, `archive` methods
- `src/infra/repositories/InMemoryCourseRepository.ts` — implement the 3 new methods
- `src/infra/repositories/PrismaCourseRepository.ts` — implement the 3 new methods (typed Prisma rows, no `any`)
- `src/composition/container.ts` — wire the 5 new use cases
- `src/composition/container.test.ts` — same in the test container

## Pitfalls

- **"Slug uniqueness across the entire table, not just status"** — even ARCHIVED courses still occupy their slug. If an admin archives `intro-to-amazon` and then tries to create a new course with the same slug, it should fail with `slug_taken`. The InMemory repo's `Map<string, Course>` keyed by id (not slug) makes this a separate check.
- **"Course curriculum shape"** — the existing `Course` entity requires a non-empty curriculum (at least one section with at least one lesson). The admin create form must generate a default curriculum, otherwise the `createCourse` entity factory will reject it. We add a `defaultCurriculum: { sectionTitle, lessonTitle }` to the use-case input; the use case builds the Curriculum shape from those strings.
- **"Archive is a status change, not a delete"** — the course row stays in the DB. Existing enrollments still reference it; the public catalog hides ARCHIVED courses. The Prisma `archive()` method does `update({ where: { id }, data: { status: "ARCHIVED" } })`, not `delete`.
- **"Page tests are optional"** — the story's Pitfalls section says "Skip the page-level integration test; it adds little value over the use case + component tests." Add page tests only if there's a real branching case worth pinning (e.g., the archive confirmation flow).
- **"Prisma `any` casts"** — the recent Tier C cleanup replaced `any` with `Prisma.XGetPayload<{}>` in the badge repos. The Prisma course repo should follow the same pattern. NO `any` casts in this story.
- **"The `InMemoryCourseRepository` already has a slug-uniqueness check via `findBySlug`"** — we need to also enforce it in `create()` and `update()`. Use `findBySlug` to check before writing.
- **"The existing `listAll` doesn't sort"** — the in-memory repo's `listAll()` returns courses in insertion order, which is fine for now. The admin list use case will sort by `displayOrder` then `createdAt` in-memory (same as `listPublished` does).
- **"Money formatting"** — use the existing `formatPhp` helper from `src/app/admin/_lib/formatPhp.ts`.
- **"Tier badge variant"** — `courseTier === "PRO"` → accent; others → neutral. Same pattern as the users list.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
  pnpm vitest run
```

Manual smoke (in a follow-up, not this PR):
- Sign in as admin
- Visit `/admin/courses` — see seeded courses (or "No courses")
- Click "Add course" — fill the form — submit
- See the new course in the list
- Click the course — see the detail page
- Click "Edit" — change the title — save
- See the updated title
- Click "Archive" — confirm
- See the course status=ARCHIVED
- Try to create a new course with the same slug — see `slug_taken` error

## Out of scope (separate stories)

- **STORY-048b** — Module domain entity + admin modules CRUD + reorder
- **STORY-048c** — Lesson domain entity + admin lessons CRUD + MDX editor
- **Un-archive** (move ARCHIVED → DRAFT) — out of scope for v1
- **Bulk actions** — out of scope
- **Course preview** (admin previews a course as a student would see it) — out of scope
- **Course cloning** (duplicate an existing course) — out of scope
- **AuditLog** for create/update/archive actions — out of scope (no AuditLog port yet; AGENTS.md promise not yet delivered)
