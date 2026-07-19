# STORY-048c: Lesson domain + admin lessons CRUD + MDX editor

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-048a, STORY-048b
**Blocks:** STORY-048d (lesson analytics, future)

## Status

- **Story**: STORY-048c
- **Sprint**: 10 — Admin panel
- **Points**: 1
- **Status**: Pending

## Overview

Build the Lesson domain entity (currently embedded inside `Module.lessons`), then ship the admin lessons CRUD surface with an MDX editor. Each module has many lessons; each lesson has a type (VIDEO, TEXT, QUIZ) and content (shape depends on type).

The MDX editor is the non-trivial part: it needs a code editor component (probably `@uiw/react-md-editor` or similar), live preview, syntax highlighting, and a save endpoint.

## Why

Lessons are the third of three CRUD surfaces in the original STORY-048. Splitting from 048a/048b because:

1. Lessons require a new domain entity + repo + port extension
2. The MDX editor requires a new code-editor component (likely a new dependency, needs to be approved per AGENTS.md)
3. The lesson-content shapes (VIDEO duration, TEXT body, QUIZ questions) are heterogeneous and worth their own design pass

## Acceptance Criteria (sketch — to be detailed at start of work)

- [ ] `src/domain/entities/Lesson.ts` — new entity (id, moduleId, title, type, content, displayOrder, createdAt, updatedAt)
- [ ] `src/ports/repositories/ILessonRepository.ts` — `findByModuleId`, `create`, `update`, `delete`, `reorder(moduleId, lessonIds[])`
- [ ] `src/infra/repositories/InMemoryLessonRepository.ts` — in-memory adapter
- [ ] `src/infra/repositories/PrismaLessonRepository.ts` — Prisma adapter
- [ ] `src/usecases/AdminListLessons.ts`
- [ ] `src/usecases/CreateLesson.ts` (validates content shape per type)
- [ ] `src/usecases/UpdateLesson.ts`
- [ ] `src/usecases/DeleteLesson.ts`
- [ ] `src/usecases/ReorderLessons.ts`
- [ ] `src/components/admin/MdxEditor.tsx` — MDX editor component (uses `@uiw/react-md-editor` or similar — must be approved as a new dep)
- [ ] Pages: `/admin/courses/[id]/modules/[moduleId]/lessons`, `/admin/courses/[id]/modules/[moduleId]/lessons/new`, `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/edit`
- [ ] Edit lesson page renders the MDX editor with the current content
- [ ] Course detail page — Lessons section now live
- [ ] Public catalog pages (`/courses/[slug]`, lesson page) — update to use the new domain entities

## Out of scope (separate stories)

- **Lesson-level analytics** (per-lesson completion rate, drop-off) — future
- **Lesson versioning** (track changes, allow reverting) — future
- **Lesson attachments** (PDF, slides) — future
- **Lesson scheduling** (release lessons on a calendar) — future
- **Interactive video lessons** (HLS player, chapters) — future; for now VIDEO lessons just have a `durationMinutes` field
- **QUIZ lesson content** (this story ships the data shape; the QUIZ UI is a separate story)
