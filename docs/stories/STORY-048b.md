# STORY-048b: Module domain + admin modules CRUD + reorder

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-048a
**Blocks:** STORY-048c (which adds lessons inside modules)

## Status

- **Story**: STORY-048b
- **Sprint**: 10 — Admin panel
- **Points**: 1
**Status:** ✅ Done (PR #048b, commit `4c3102a` — `feat(admin): STORY-048b admin modules CRUD + reorder`)

## Goal

Introduce the **Module** domain entity as a first-class object with its own repository, then ship the admin modules CRUD surface with up/down reorder.

After this story:

- `Module` is a standalone domain entity with `id`, `courseId`, `title`, `displayOrder`, `createdAt`, `updatedAt`.
- `IModuleRepository` port: `findByCourseId`, `create`, `update`, `delete`, `reorder`.
- `InMemoryModuleRepository` (test adapter) + `PrismaModuleRepository` (production adapter).
- Admin pages:
  - `/admin/courses/[id]` — Modules section is now a live list with reorder controls (replaces the placeholder)
  - `/admin/courses/[id]/modules` — full modules list page
  - `/admin/courses/[id]/modules/new` — create form
  - `/admin/courses/[id]/modules/[moduleId]` — module detail (read-only)
  - `/admin/courses/[id]/modules/[moduleId]/edit` — module edit form
  - `/admin/courses/[id]/modules/[moduleId]/delete` — delete form (POST)
- Reorder: up/down buttons on each module row + a "Move to position" form.
- Lessons section remains a placeholder pointing at STORY-048c.

## Why

Modules are the second of three CRUD surfaces in the original STORY-048. Splitting from 048a because:

1. Modules require a new domain entity + repo + port extension
2. The reorder logic is non-trivial (atomic reorder use case + UI controls)
3. STORY-048c (lessons) builds on top of modules

## Scope decision: don't replace Course.curriculum yet

The `Course.curriculum` JSON blob still holds the embedded Section/Lesson shape for backward compat. For 048b:

- New `Module` entity lives in its own table
- The admin surfaces operate on `Module` (CRUD + reorder)
- The public catalog pages (`/courses/[slug]`, lesson page) are NOT updated in this story — they still use `Course.curriculum`. A follow-up (post-048c) can migrate the catalog to the new entities.
- `isValidCurriculum` stays as-is (it requires the embedded Section/Lesson shape for backward compat with the existing public catalog).

This keeps 048b bounded. The full migration of `Course.curriculum` to a join of Module+Lesson is out of scope and is a larger refactor.

## Acceptance Criteria

### Domain

- [ ] `src/domain/entities/Module.ts`:
  - `Module` interface: `{ id, courseId, title, displayOrder, createdAt, updatedAt }`
  - `createModule(params)` factory — validates title is non-empty
  - `updateModule(module, patch)` factory — re-validates

### Port

- [ ] `src/ports/repositories/IModuleRepository.ts`:
  - `findByCourseId(courseId): Promise<Result<readonly Module[], ModuleError>>`
  - `findById(id): Promise<Result<Module, ModuleError>>`
  - `create(module): Promise<Result<Module, ModuleError>>`
  - `update(module): Promise<Result<Module, ModuleError>>`
  - `delete(id): Promise<Result<void, ModuleError>>`
  - `reorder(courseId, moduleIds[]): Promise<Result<readonly Module[], ModuleError>>`
- [ ] `ModuleError` union: `not_found`, `db_error`

### Infra

- [ ] `src/infra/repositories/InMemoryModuleRepository.ts` — implements all 6 methods
- [ ] `src/infra/repositories/PrismaModuleRepository.ts` — typed Prisma rows (no `any`)
- [ ] `src/infra/repositories/__tests__/InMemoryModuleRepository.test.ts` — Tier B #2 closure (10+ tests)

### Use cases (all TDD)

- [ ] `src/usecases/AdminListModules.ts` — list modules for a course, sorted by displayOrder
  - Input: `{ courseId: string }`
  - Output: `{ modules: readonly Module[] }`
- [ ] `src/usecases/CreateModule.ts` — create a new module in a course
  - Input: `{ id, courseId, title }`
  - Auto-assigns `displayOrder` = `count(modules in course) + 1`
  - Output: `{ module: Module }`
- [ ] `src/usecases/UpdateModule.ts` — update title
  - Input: `{ moduleId, patch: { title? } }`
- [ ] `src/usecases/DeleteModule.ts` — delete a module
  - Input: `{ moduleId }`
- [ ] `src/usecases/ReorderModules.ts` — atomic reorder
  - Input: `{ courseId, moduleIds: string[] }` (the new order)
  - Output: `{ modules: readonly Module[] }` (the reordered list)
  - Validates: all moduleIds belong to courseId; all current modules are in the list (no orphans)
  - Updates displayOrder for each (1, 2, 3, ...)

### Tests

- [ ] `src/usecases/__tests__/AdminListModules.test.ts`
- [ ] `src/usecases/__tests__/CreateModule.test.ts`
- [ ] `src/usecases/__tests__/UpdateModule.test.ts`
- [ ] `src/usecases/__tests__/DeleteModule.test.ts`
- [ ] `src/usecases/__tests__/ReorderModules.test.ts`
- [ ] `src/infra/repositories/__tests__/InMemoryModuleRepository.test.ts` (NEW)

### Server actions

- [ ] `src/app/actions/createModule.action.ts`
- [ ] `src/app/actions/updateModule.action.ts`
- [ ] `src/app/actions/deleteModule.action.ts`
- [ ] `src/app/actions/reorderModules.action.ts` — takes the new order from a form, calls the use case

### Pages

- [ ] `/admin/courses/[id]` — Modules section is now live (replaces the STORY-048a placeholder)
  - Shows module list with title + lesson count placeholder + up/down reorder buttons + edit + delete
  - "Add module" button → `/admin/courses/[id]/modules/new`
- [ ] `/admin/courses/[id]/modules` — full list (can be a redirect to `?modules=1` on the course detail, or a separate page; pick one)
- [ ] `/admin/courses/[id]/modules/new` — create form (title + default section title)
- [ ] `/admin/courses/[id]/modules/[moduleId]` — read-only detail (title + displayOrder + createdAt + lessons placeholder)
- [ ] `/admin/courses/[id]/modules/[moduleId]/edit` — edit form
- [ ] Delete + reorder are inline forms on the course detail page (no separate routes)

### Container

- [ ] `src/composition/container.ts` — add `adminListModules`, `createModule`, `updateModule`, `deleteModule`, `reorderModules` to `AppContainer`
- [ ] `src/composition/container.test.ts` — same in the test container

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 1068 + new tests passing
- [ ] `pnpm build` succeeds

## Files to Create

```
src/domain/entities/Module.ts

src/ports/repositories/IModuleRepository.ts

src/infra/repositories/InMemoryModuleRepository.ts
src/infra/repositories/PrismaModuleRepository.ts
src/infra/repositories/__tests__/InMemoryModuleRepository.test.ts

src/usecases/AdminListModules.ts
src/usecases/CreateModule.ts
src/usecases/UpdateModule.ts
src/usecases/DeleteModule.ts
src/usecases/ReorderModules.ts

src/usecases/__tests__/AdminListModules.test.ts
src/usecases/__tests__/CreateModule.test.ts
src/usecases/__tests__/UpdateModule.test.ts
src/usecases/__tests__/DeleteModule.test.ts
src/usecases/__tests__/ReorderModules.test.ts

src/app/actions/createModule.action.ts
src/app/actions/updateModule.action.ts
src/app/actions/deleteModule.action.ts
src/app/actions/reorderModules.action.ts

src/app/admin/courses/[id]/modules/
├── page.tsx
├── new/
│   └── page.tsx
├── [moduleId]/
│   ├── page.tsx
│   └── edit/
│       └── page.tsx
```

## Files to Modify

- `src/app/admin/courses/[id]/page.tsx` — replace the Modules placeholder with the live section
- `src/composition/container.ts` — wire the 5 new use cases
- `src/composition/container.test.ts` — same

## Pitfalls

- **"Atomic reorder"** — the use case must validate that the input list contains ALL current modules for the course. If even one is missing or one is extra, the whole reorder is rejected. Otherwise the DB and the in-memory state would diverge.
- **"displayOrder is 1-indexed"** — when reordering, assign 1, 2, 3, ... in the new order. Don't preserve gaps (no need for sparse ordering).
- **"CreateModule's displayOrder is the count+1"** — appending to the end. If a course has 3 modules, the new one is displayOrder=4.
- **"DeleteModule may leave gaps"** — if a course has modules with displayOrder 1, 2, 3, 4 and you delete #2, the remaining are 1, 3, 4. Reorder can fix the gap. We don't auto-renumber on delete (to keep the operation cheap).
- **"Prisma Module model doesn't exist yet"** — need to add it to the schema. The `PrismaModuleRepository` would use a placeholder `unimplemented` throw if the schema isn't ready, then we can wire it later. For this story, focus on the use cases + in-memory adapter; the Prisma adapter can land in a follow-up if the schema migration is non-trivial.
- **"No AuditLog"** — same as 048a. TODO comment in the use cases.
- **"The new Module entity is independent of Course.curriculum"** — for this story, they coexist. The public catalog still uses the embedded JSON. A future story migrates the catalog to read from Module+Lesson.

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
- Visit `/admin/courses/[id]` — see Modules section with any existing modules (or empty)
- Click "Add module" — fill the form — submit
- See the new module in the list with displayOrder=N+1
- Click the up/down arrows — module moves in the list (displayOrder updates)
- Click "Edit" — change the title — save
- Click "Delete" — confirm — module gone
- Try to reorder with a malformed input (missing a module) — see error

## Out of scope (separate stories)

- **STORY-048c** — Lesson domain + admin lessons CRUD + MDX editor
- **Migration of Course.curriculum → Module+Lesson** — separate refactor
- **Public catalog update** (`/courses/[slug]`, lesson page) to read from Module+Lesson
- **Module-level access policy** (some modules are preview-only, some are paid)
- **Module analytics** (completion rate per module)
- **Bulk reorder** (drag-and-drop across many modules at once) — out of scope for v1
- **Prisma Module schema migration** — may need a separate follow-up if the schema change is non-trivial
- **AuditLog** for module CRUD actions
