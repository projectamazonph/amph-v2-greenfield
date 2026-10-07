# STORY-139: P3-87 — In-app notifications

**Points:** 3

**Epic:** Student experience (P3-87)

**Owner:** Ryan

**Status:** Done.

## Context

P3-87 is the last of the six deferred P3 features
(`docs/REMAINING-P3-FEATURES.md`). P3-82 (confetti), P3-83
(drag-and-drop), P3-84 (dark mode), P3-85 (CSV export), and P3-86
(PDF certificates) all ship. Students currently learn about course
completion, artefact review, and refunds only by navigating to the
right page; there is no bell, no unread count, no push surface.

## Goal

Ship a notification bell with an unread count in the student
shell, a dropdown listing the caller's notifications newest-first,
mark-read on click, mark-all-read, and 30-second polling. Backend:
`Notification` entity, `INotificationRepository` port, Prisma +
InMemory adapters, `NotifyUser` / `ListNotifications` /
`MarkNotificationRead` / `MarkAllNotificationsRead` use cases on
both containers, and server actions (mutations go through server
actions per AGENTS.md Rule 4, not API routes). First emit hook:
course completion from `markLessonCompleteAction` when
`progressPercent` hits 100.

## Scope

- Domain entity `Notification` with types: `course_complete`,
  `artefact_submitted`, `enrollment_welcome`, `refund_requested`,
  `announcement`. Title/body required, href optional.
- `INotificationRepository`: `create`, `listByUser` (unread first,
  then newest), `markRead` (owner check), `markAllRead`,
  `unreadCount`.
- Prisma model `notifications` + migration with `deletedAt`,
  `createdById`, `updatedById`.
- Use cases + server actions for list / mark-read / mark-all-read /
  notify.
- `NotificationBell` client component: bell icon (Phosphor),
  unread badge, dropdown, 30s polling via the list action,
  mark-read on item click.
- Wire the bell into `StudentShell` header.
- Emit: `markLessonCompleteAction` notifies `course_complete`
  when the returned `progressPercent` is 100. Best-effort: a
  failed notify never fails the completion.
- Domain branch coverage 100%. Use-case tests via
  `buildTestContainer()`. Component test for the bell.

## Acceptance criteria

- A signed-in student sees the bell in the shell header with the
  unread count.
- Clicking an item marks it read and drops the count.
- Completing the last lesson of a course creates one
  `course_complete` notification with a link to `/certificates`.
- Another student's notifications never leak (owner-scoped reads,
  owner-checked writes).
- A failed notify does not fail lesson completion.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Email/push delivery (in-app only).
- Admin broadcast UI (a later story; the `announcement` type
  reserves the shape).
- Refund/enrollment emits (follow-ups reusing `NotifyUser`).
- Server-Sent Events (polling first; SSE is a later optimization).

## Dependencies

- None beyond the existing shell, auth, and container patterns.

## Verification

- Domain unit tests (100% branch), use-case tests, action tests,
  bell component test.
- Manual smoke: sign in, complete a final lesson, open the bell,
  confirm the course_complete row, click it, confirm the count drops.
