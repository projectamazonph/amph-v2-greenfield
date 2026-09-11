# P1-02 — Assignments (PR-C slice 2)

**Status:** In progress (`feat/p1-02-assignments`, part of PR-C per #403)
**Branch policy:** branch from main, PR to main, squash merge.

## Scope

Instructor-assigned student work on the `Assignment` model
(courseId, userId, title, long-form description, dueAt).

- Domain `Assignment` entity: create validation, pure
  PENDING to SUBMITTED to GRADED transitions, derived overdue flag,
  100 percent branch coverage.
- Port `IAssignmentRepository` plus InMemory and Prisma adapters.
- `CreateAssignment` (admin, audited), `SubmitAssignment` (the
  assignee only, audited), `GradeAssignment` (admin/grader, 0-100
  integer plus feedback, audited), `ListStudentAssignments` and
  `AdminListAssignments` (status and course filters, pagination).
- Server actions (admin create/grade, student submit) plus audited
  outcomes.
- Admin `/admin/assignments` list (search, filter, pagination), new
  form, and grade form. Student `/assignments` page under Learn with
  submit buttons and overdue display.
- No new migration: the W0-01 `assignments` table already carries
  every column including audit fields.

## Out of scope

- P1-03 resource polish, P1-05 settings, P1-06 email templates
  (other PR-C slices), PR-D OAuth.
- Submission file uploads or rich-text answers. The schema has no
  submission-body column, so submit is a status flip with a
  timestamp; the student proves the work in the linked lesson,
  simulator, or live class the assignment text names.
- The persisted OVERDUE status value. Overdue is derived at read
  time (PENDING past dueAt); no sweep writes it in this slice.

## Verification

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` green.
- New suites: Assignment entity, InMemoryAssignmentRepository,
  all five use cases, both server-action files, student notice
  rendering.
