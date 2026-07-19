# STORY-050e: Badges (admin CRUD) + settings

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-050a (audit log writes for badge CRUD)
**Blocks:** none

## Status

- **Story**: STORY-050e
- **Sprint**: 10 — Admin panel
- **Points**: 1
- **Status**: Pending (split from original STORY-050)

## Why split

See STORY-050a. Two distinct surfaces (badges + settings) packed into the last slot of the 5-way split.

## Goal

Ship the admin badge CRUD surface AND a minimal settings page (read-only view of app config + a few toggles).

## Acceptance Criteria

### Badges
- [ ] `Badge` entity already exists. Confirm the create/update factories exist.
- [ ] `IBadgeRepository` already exists. Add `listAll`, `create`, `update`, `archive` (or `delete`).
- [ ] 4 use cases: `AdminListBadges`, `CreateBadge`, `UpdateBadge`, `ArchiveBadge`
- [ ] All TDD
- [ ] Audit log writes
- [ ] Admin pages: list, new, detail, edit
- [ ] Container wiring
- [ ] The student-side `AwardBadge` and `ListUserBadges` use cases keep working

### Settings
- [ ] `src/app/admin/settings/page.tsx` — read-only view of key env vars / app config
- [ ] Displays: PayMongo mode (test/live), Resend configured, base URL, app version
- [ ] No mutations for 050e (settings mutations are a follow-up)
- [ ] Container doesn't need new use cases — the page just reads from env / process

## Pitfalls

- Settings page must not leak secrets (PayMongo secret key, Resend API key, etc.) — only show "configured: yes/no" booleans.
- Badge CRUD must not break the `AwardBadge` flow that auto-creates badges on XP milestones (if that's a thing in the existing code).

## Out of scope

- Settings mutations (write-back to env or DB)
- Badge image upload (use a URL field for now)
- Badge auto-creation rules
- Badge analytics
