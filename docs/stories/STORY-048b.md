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
- **Status**: Pending

## Overview

Build the Module domain entity (currently embedded inside `Course.curriculum.sections`), then ship the admin modules CRUD surface with reorder. Each course has many modules; each module belongs to exactly one course. Modules have a `displayOrder` field that admins can change via up/down buttons or drag-and-drop.

## Why

Modules are the second of three CRUD surfaces in the original STORY-048. Splitting from 048a because:

1. Modules require a new domain entity + repo + port extension (significant work on its own)
2. The reorder logic is non-trivial (needs optimistic UI or explicit save buttons, plus a `ReorderModules` use case)
3. STORY-048c (lessons) builds on top of modules

## Acceptance Criteria (sketch — to be detailed at start of work)

- [ ] `src/domain/entities/Module.ts` — new entity (id, courseId, title, displayOrder, createdAt, updatedAt)
- [ ] `src/ports/repositories/IModuleRepository.ts` — `findByCourseId`, `create`, `update`, `delete`, `reorder(courseId, moduleIds[])`
- [ ] `src/infra/repositories/InMemoryModuleRepository.ts` — in-memory adapter
- [ ] `src/infra/repositories/PrismaModuleRepository.ts` — Prisma adapter
- [ ] `src/usecases/AdminListModules.ts` — list modules for a course
- [ ] `src/usecases/CreateModule.ts`
- [ ] `src/usecases/UpdateModule.ts`
- [ ] `src/usecases/DeleteModule.ts`
- [ ] `src/usecases/ReorderModules.ts` — atomic reorder of a course's modules
- [ ] Pages: `/admin/courses/[id]/modules` (list + create + reorder), `/admin/courses/[id]/modules/[moduleId]/edit`
- [ ] Course detail page (`/admin/courses/[id]`) — Modules section now live, Lessons still a placeholder
- [ ] Edit course page — replace the placeholder with a real link to the modules page

## Out of scope (separate stories)

- **STORY-048c** — Lesson domain + admin lessons CRUD + MDX editor (depends on this)
- **Bulk reorder** (drag-and-drop across many modules) — out of scope for v1; use up/down buttons
- **Module-level access policy** — out of scope
- **Module analytics** (completion rate per module) — out of scope
