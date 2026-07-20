# STORY-050c: Live classes (CRUD)

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-050a (audit log writes for live class CRUD)
**Blocks:** none

## Status

- **Story**: STORY-050c
- **Sprint**: 10 — Admin panel
- **Points**: 1
**Status:** ✅ Done (PR #050c, commit `3ad1b60` — `feat(admin): STORY-050c live class CRUD`)

## Why split

See STORY-050a. Live classes are a distinct CRUD surface; need a new domain entity (no `LiveClass` entity exists yet).

## Goal

Ship the admin live class CRUD surface.

## Acceptance Criteria

- [ ] `src/domain/entities/LiveClass.ts`: NEW entity (id, courseId, title, scheduledAt, durationMinutes, instructorId, meetingUrl, status)
- [ ] `ILiveClassRepository` port: findByCourseId, findById, create, update, delete, listAll
- [ ] 5 use cases: `AdminListLiveClasses`, `CreateLiveClass`, `UpdateLiveClass`, `DeleteLiveClass`, `AdminGetLiveClass`
- [ ] All TDD
- [ ] Audit log writes
- [ ] Admin pages: list, new, detail, edit
- [ ] Container wiring
- [ ] The existing `LiveClassReminderEmail` template may need to be wired into a use case that runs on live class creation/update

## Pitfalls

- The `LiveClassReminderEmail` template is already a stub in `src/infra/email/templates/`. Either wire it up here or punt to a follow-up.
- Live classes may need a separate Student UI surface (list of upcoming live classes, RSVP, etc.). Out of scope for 050c — admin-only.

## Out of scope

- Public live class listing page
- Live class RSVP / attendance
- Live class reminder email automation
- Live class video integration
