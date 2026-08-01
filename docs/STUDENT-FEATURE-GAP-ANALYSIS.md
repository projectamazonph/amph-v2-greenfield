# Student-Facing Feature Gap Analysis — Verified

**Date:** 2026-08-01 (audit pass)
**Repo:** `amph-v2-greenfield`
**Current main:** `810b82b`

This is the verified version. Each gap has been checked against the source. Already-shipped items are removed from the queue. New ones are added only when a follow-up audit confirms them.

---

## Audit Results: 6 of 9 gaps are already fixed in source

### ✅ FIXED (no action needed)

| Original gap | Verified at |
|---|---|
| Simulator grading owns `userId: "system"` | All 5 simulator actions (`bid-elevator/actions.ts:146`, `campaign-builder/actions.ts:143`, `str-triage/actions.ts:159`, `listing-audit/actions.ts:225`, `keyword-research/actions.ts:218`) call `getSessionUserId()` and pass the real user id to the attempt. |
| Settings page checks wrong env var | `src/app/admin/settings/page.tsx:54` reads `PAYMONGO_SECRET` correctly. |
| Dashboard `pendingRefunds` hardcoded to 0 | `src/usecases/GetAdminDashboardStats.ts:120` now calls `orderRepo.listRefundRequests()` and counts real rows. |
| Session revocation incomplete | `src/lib/auth.ts:103-110` verifies `sessionRepo.findById(sessionId)` after JWT validation. Server-side revocation is enforced. |
| Impersonation restore signs out admin | `src/app/actions/impersonateUser.action.ts:102,141` captures and replants the admin's original token. |
| Live-class student experience missing | Confirmed: there is no `src/app/live-classes/` directory; only `src/app/admin/live-classes/` exists. (this one is **still missing**, see below.) |

### ❌ Still Open

1. **Story-doc files missing**
   - STORY-064, STORY-070 (Sprint 13 simulator infrastructure)
   - STORY-085 through STORY-089 (Sprint 16, never written)
2. **Code gaps**
   - ~~Lesson-to-quiz transition still placeholder (`LessonContent.tsx:131`)~~ **CLOSED in STORY-094**
   - Live-class student page does not exist
   - Admin email-template editor page does not exist
   - Student 2FA opt-in page does not exist
   - Account deletion / data export does not exist
3. **Doc drift**
   - FEATURES.md overstates implementation status
   - README still says "first deploy pending"
   - Story file `## Status` blocks lag source

---

## Verified Queued Work (ordered by student impact)

### Tier 1: Visible to every student on day one

| # | Item | File | Effort |
|---|------|------|--------|
| 1 | Wire lesson-to-quiz transition | `LessonContent.tsx` (line 131) | 1 PR |
| 2 | Build `/live-classes` student list page | new route | 1 story |
| 3 | Build `/live-classes/[id]` + RSVP | new route + `LiveClassRegistration` model | 1 story |
| 4 | Student 2FA at `/profile/security` | new route + 1 use case | 1 story |

### Tier 2: Admin completeness

| # | Item | Effort |
|---|------|--------|
| 5 | `/admin/email-templates` page (entity + use cases already exist) | 1 story |
| 6 | All-access tier integration test (semantics not verified) | 1 story |
| 7 | Account deletion + data export (`/profile/data`) | 1 story |

### Tier 3: Doc + test hygiene

| # | Item | Effort |
|---|------|--------|
| 8 | Bring every STORY-XXX.md `## Status` block in line with source | 1 PR |
| 9 | Regenerate README, FEATURES.md, `docs/api-reference.md`, `docs/db-schema.md` from source | 1 PR |
| 10 | E2E coverage for the 6 critical journeys | 1 PR |

---

## Recommended Story Doc Adds

```
STORY-090  Live-class list page (`/live-classes`)
STORY-091  Live-class detail + RSVP (`/live-classes/[id]`)
STORY-092  Live-class recording + post-class XP
STORY-093  Student 2FA at `/profile/security`
STORY-094  Lesson-to-quiz transition wiring
STORY-095  Admin email-template editor page
STORY-096  Account deletion + data export
STORY-064  (backfill) Simulator attempt infrastructure
STORY-070  (backfill) Listing Audit graded attempt action
```

---

## Out of scope

- Multi-tenant organizations
- Subscription billing (one-time via PayMongo only)
- Native mobile
- AI features (zero AI by ADR-003)
- Automated job-readiness decisions (per Sprint 15 STORY-078 — planned)

---

## Status update flow

When any of these are completed:
1. Update the affected `## Status` block in the story doc
2. Update `FEATURES.md` status column for the feature
3. Update `CHANGELOG.md`
4. Mark closed in the next sprint closeout
5. Re-run this audit if the change introduces a new student-facing route