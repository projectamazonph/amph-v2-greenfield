# STORY-048c: Lesson domain + admin lessons CRUD + MDX editor

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-048a, STORY-048b
**Blocks:** none (closes the 048 trilogy)

## Status

- **Story**: STORY-048c
- **Sprint**: 10 — Admin panel
- **Points**: 1
**Status:** ✅ Done (PR #048c, commit `2a940f8` — `feat(admin): STORY-048c admin lessons CRUD + JSON content editor`)

## Goal

Introduce the **Lesson** domain entity as a first-class object with its own repository, then ship the admin lessons CRUD surface with reorder (within a module) and a basic MDX/textarea content editor.

After this story:

- `Lesson` is a standalone domain entity with `id`, `moduleId`, `title`, `type` (VIDEO/TEXT/QUIZ), `content` (JSON), `displayOrder` (within module), `createdAt`, `updatedAt`.
- `ILessonRepository` port: `findByModuleId`, `findById`, `create`, `update`, `delete`, `reorder`.
- `InMemoryLessonRepository` (test adapter) + `PrismaLessonRepository` (production adapter — deferred per below).
- Admin pages:
  - `/admin/courses/[id]/modules/[moduleId]` — Lessons section is now live (replaces the STORY-048b placeholder) with reorder + edit + delete + add-new
  - `/admin/courses/[id]/modules/[moduleId]/lessons/new` — create form (title, type, content) with type-specific content UI
  - `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]` — read-only detail
  - `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/edit` — edit form

## Why

Lessons are the third CRUD surface in the original STORY-048. Splitting from 048a/b because:

1. Lessons require a new domain entity + repo + port extension
2. The content shape depends on `type` (VIDEO has `durationMinutes`, TEXT has `body`, QUIZ has `questions`)
3. The MDX editor is a separate concern from the lesson CRUD (the MDX editor is a stretch goal; the basic content editor is a textarea for TEXT, duration field for VIDEO, JSON textarea for QUIZ)

## Scope decision: don't replace Course.curriculum yet (carries from 048b)

`Course.curriculum` (embedded JSON) still holds the legacy Section/Lesson shape. The admin surfaces operate on `Module` (since 048b) and now `Lesson` (048c). The public catalog pages (`/courses/[slug]`, lesson page) are NOT updated in this story.

After 048c, the embedded `Course.curriculum` becomes **derived** data — at read time, the public catalog pages should switch to joining `Module` + `Lesson`. That's a separate refactor; out of scope here.

For 048c, the legacy `isValidCurriculum` rule (1+ sections, 1+ lessons per section) is no longer required by the admin surfaces; it remains for backward compat with the existing catalog.

## Acceptance Criteria

### Domain

- [ ] `src/domain/entities/Lesson.ts`:
  - `Lesson` interface: `{ id, moduleId, title, type, content, displayOrder, createdAt, updatedAt }`
  - `LessonType = "VIDEO" | "TEXT" | "QUIZ"`
  - `createLesson(params)` factory — validates title, type, content shape per type
  - `updateLesson(lesson, patch)` factory — re-validates

### Port

- [ ] `src/ports/repositories/ILessonRepository.ts`:
  - `findByModuleId(moduleId): Promise<Result<readonly Lesson[], LessonError>>`
  - `findById(id): Promise<Result<Lesson, LessonError>>`
  - `create(lesson): Promise<Result<Lesson, LessonError>>`
  - `update(lesson): Promise<Result<Lesson, LessonError>>`
  - `delete(id): Promise<Result<void, LessonError>>`
  - `reorder(moduleId, lessonIds[]): Promise<Result<readonly Lesson[], LessonError>>`
- [ ] `LessonError` union: `not_found`, `db_error`, `invalid_content`

### Infra

- [ ] `src/infra/repositories/InMemoryLessonRepository.ts` — implements all 6 methods
- [ ] `src/infra/repositories/PrismaLessonRepository.ts` — typed Prisma rows (deferred; throws unimplemented)
- [ ] `src/infra/repositories/__tests__/InMemoryLessonRepository.test.ts` — Tier B #2 closure (10+ tests)

### Use cases (all TDD)

- [ ] `src/usecases/AdminListLessons.ts` — list lessons for a module, sorted by displayOrder
  - Input: `{ moduleId: string }`
  - Output: `{ lessons: readonly Lesson[] }`
- [ ] `src/usecases/AdminGetLesson.ts` — get a lesson by id
  - Input: `{ lessonId: string }`
- [ ] `src/usecases/CreateLesson.ts` — create a new lesson in a module
  - Input: `{ id, moduleId, title, type, content }`
  - Auto-assigns `displayOrder` = `count(lessons in module) + 1`
  - Output: `{ lesson: Lesson }`
- [ ] `src/usecases/UpdateLesson.ts` — update title / type / content
  - Input: `{ lessonId, patch: { title?, type?, content? } }`
  - If `type` is changed, `content` must be re-validated against the new type
- [ ] `src/usecases/DeleteLesson.ts` — delete a lesson
  - Input: `{ lessonId }`
- [ ] `src/usecases/ReorderLessons.ts` — atomic reorder within a module
  - Input: `{ moduleId, lessonIds: string[] }`

### Tests

- [ ] `src/usecases/__tests__/AdminListLessons.test.ts`
- [ ] `src/usecases/__tests__/AdminGetLesson.test.ts`
- [ ] `src/usecases/__tests__/CreateLesson.test.ts`
- [ ] `src/usecases/__tests__/UpdateLesson.test.ts`
- [ ] `src/usecases/__tests__/DeleteLesson.test.ts`
- [ ] `src/usecases/__tests__/ReorderLessons.test.ts`
- [ ] `src/infra/repositories/__tests__/InMemoryLessonRepository.test.ts`

### Server actions

- [ ] `src/app/actions/createLesson.action.ts`
- [ ] `src/app/actions/updateLesson.action.ts`
- [ ] `src/app/actions/deleteLesson.action.ts`
- [ ] `src/app/actions/reorderLessons.action.ts`

### Pages

- [ ] `/admin/courses/[id]/modules/[moduleId]` — Lessons section is now live
  - Shows lesson list with title + type badge + up/down reorder + edit + delete
  - "Add lesson" button → `/admin/courses/[id]/modules/[moduleId]/lessons/new`
- [ ] `/admin/courses/[id]/modules/[moduleId]/lessons/new` — create form
  - Fields: title (required), type (VIDEO/TEXT/QUIZ radio), content (type-specific)
  - VIDEO: `durationMinutes` (number input, required)
  - TEXT: `body` (textarea, required; this is the MDX editor placeholder)
  - QUIZ: `questions` (JSON textarea, required; format described in the placeholder)
- [ ] `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]` — read-only detail
  - Shows all lesson fields + content rendered appropriately per type
- [ ] `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/edit` — edit form

### Container

- [ ] `src/composition/container.ts` — add 6 new use cases + `lessonRepo` port
- [ ] `src/composition/container.test.ts` — same

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 1121 + new tests passing
- [ ] `pnpm build` succeeds

## MDX editor scope decision

The original STORY-048 mentioned an MDX editor. For 048c, we're shipping a **basic textarea** for TEXT lessons (with a placeholder "MDX editor lands in a follow-up" comment). The reasons:

1. A real MDX editor (live preview, syntax highlighting, MDX components) is a 1-2 day feature on its own
2. The placeholder is clear and the migration to a real editor is non-breaking
3. The TEXT content is stored as a string in the `content.body` field — switching to MDX is purely a frontend change
4. Keeping 048c within a 1-pt budget

The follow-up story (`STORY-048c.5: MDX editor`) is documented in the Pitfalls.

## Files to Create

```
src/domain/entities/Lesson.ts

src/ports/repositories/ILessonRepository.ts

src/infra/repositories/InMemoryLessonRepository.ts
src/infra/repositories/PrismaLessonRepository.ts (stub)
src/infra/repositories/__tests__/InMemoryLessonRepository.test.ts

src/usecases/AdminListLessons.ts
src/usecases/AdminGetLesson.ts
src/usecases/CreateLesson.ts
src/usecases/UpdateLesson.ts
src/usecases/DeleteLesson.ts
src/usecases/ReorderLessons.ts

src/usecases/__tests__/AdminListLessons.test.ts
src/usecases/__tests__/AdminGetLesson.test.ts
src/usecases/__tests__/CreateLesson.test.ts
src/usecases/__tests__/UpdateLesson.test.ts
src/usecases/__tests__/DeleteLesson.test.ts
src/usecases/__tests__/ReorderLessons.test.ts

src/app/actions/createLesson.action.ts
src/app/actions/updateLesson.action.ts
src/app/actions/deleteLesson.action.ts
src/app/actions/reorderLessons.action.ts

src/app/admin/courses/[id]/modules/[moduleId]/lessons/
├── new/
│   └── page.tsx
├── [lessonId]/
│   ├── page.tsx
│   └── edit/
│       └── page.tsx
```

## Files to Modify

- `src/app/admin/courses/[id]/modules/[moduleId]/page.tsx` — replace the Lessons placeholder with the live section
- `src/composition/container.ts` — wire 6 new use cases + `lessonRepo` (in-memory for prod too — no Prisma lesson table yet)
- `src/composition/container.test.ts` — same

## Pitfalls

- **Content shape validation** — VIDEO content must be `{ durationMinutes: number }`, TEXT content must be `{ body: string }`, QUIZ content must be `{ questions: Question[] }` where `Question = { id, prompt, options: string[], correctOptionIndex: number }`. The entity factory validates this.
- **Type-change validation in UpdateLesson** — if the patch changes `type`, the `content` must be re-validated. The use case rebuilds the lesson via the entity factory (which is the single source of truth for validation).
- **"Atomic reorder"** — same as modules. Input must contain exactly the current lessons for the module.
- **MDX editor is a placeholder** — TEXT content is a raw textarea. Real MDX editor (with preview, components) is a follow-up story.
- **No Prisma Lesson table** — prod container uses in-memory adapter (same as Module).
- **No AuditLog** — same as 048a/048b.
- **Display order is per-module** — displayOrder=1 is the first lesson in that module, not in the course. Lessons across modules don't share the counter.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
  pnpm vitest run
pnpm build
```

Manual smoke:
- Sign in as admin
- Visit a course's module detail — see Lessons section
- Add a VIDEO lesson with durationMinutes=5 — see it in the list
- Add a TEXT lesson — see it
- Add a QUIZ lesson with valid JSON — see it
- Try to add a QUIZ lesson with invalid JSON — see error
- Reorder lessons — see displayOrder update
- Edit a lesson's title — see it update
- Delete a lesson — see it gone

## Out of scope (separate stories)

- **MDX editor with preview** (STORY-048c.5)
- **Prisma Lesson schema + PrismaLessonRepository**
- **Migration of `Course.curriculum` → Module+Lesson** in the public catalog
- **Lesson analytics** (completion rate per lesson)
- **Lesson prerequisites**
- **AuditLog** for lesson CRUD actions
