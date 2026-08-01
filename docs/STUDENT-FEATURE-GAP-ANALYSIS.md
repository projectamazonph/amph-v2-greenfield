# Student-Facing Feature Gap Analysis

**Date:** 2026-08-01
**Repo:** `amph-v2-greenfield`
**Current main:** `32a5338`

This document lists the planned student-facing features and their actual state in the codebase. It is the working queue for the next round of feature work.

---

## Already shipped to students (verified routes under `src/app/`)

| Route | Purpose | Story |
|-------|---------|-------|
| `/` | Landing page | STORY-001 (landing rewrite) |
| `/signup` | New student signup | STORY-004 |
| `/login`, `/logout` | Auth | STORY-006 |
| `/verify-email` | Email verification | STORY-007 |
| `/reset-password` | Password reset | STORY-008 |
| `/pricing` | Pricing tiers + checkout entry | STORY-015 |
| `/checkout`, `/checkout/success`, `/checkout/failed` | PayMongo hosted checkout | STORY-018 |
| `/courses` | Public catalog | STORY-014 |
| `/courses/[slug]` | Course detail | STORY-014 |
| `/courses/[slug]/lessons/[lessonId]` | MDX lesson rendering | STORY-026 |
| `/courses/[slug]/lessons/[lessonId]/quiz` | Quiz player | STORY-032 |
| `/courses/[slug]/quizzes/[quizId]` | Quiz attempt route | STORY-032 |
| `/dashboard` | Student dashboard | STORY-029 (XP, streaks, progress) |
| `/profile` | Profile + badges | STORY-035 |
| `/certificates/[hash]` | Public certificate verify | STORY-043 |
| `/certificates/[hash]/pdf` | PDF download | STORY-043 |
| `/tools/bid-elevator` | Simulator | STORY-037 |
| `/tools/str-triage` | Simulator | STORY-038 |
| `/tools/campaign-builder` | Simulator | STORY-039 |
| `/tools/listing-audit` | Simulator | STORY-040 |
| `/tools/keyword-research` | Simulator (4th niche) | STORY-081 |

---

## P1 — Student-facing gaps that are explicitly planned but not built

### 1. Story-doc files missing for planned stories
- **STORY-085.md, STORY-086.md, STORY-087.md, STORY-088.md, STORY-089.md** (Sprint 16) — none exist. Stories referenced in sprint plan but never authored.
- **STORY-064.md, STORY-070.md** (Sprint 13 simulator attempt/lifecycle stories) — implemented in source but no story file.

### 2. Story file status drift
The following stories are marked **Planned** in their `## Status` block but the work is actually done. They mislead anyone running `grep "Status: Planned"` for work backlog.

| Story | Actual code state | Story doc status |
|-------|-------------------|------------------|
| STORY-026 | ✅ Lesson page live | (verify) |
| STORY-027 | ✅ MarkLessonComplete in container | (verify) |
| STORY-028 | ✅ XPService + dashboard display | (verify) |
| STORY-029 | ✅ StreakService + visit recording | (verify) |
| STORY-030 | ✅ Next-lesson nav | (verify) |
| STORY-031 | ✅ Quiz model + admin editor | (verify) |
| STORY-032 | ✅ RecordQuizAttempt + UI | (verify) |
| STORY-033 | ✅ Badge model + admin CRUD | (verify) |
| STORY-034 | ✅ AwardBadge | (verify) |
| STORY-035 | ✅ Profile badges | (verify) |
| STORY-041-044 | ✅ Certificates + PDF | (verify) |
| STORY-063 | ◐ Backend partial — admin template pages missing | matches |
| STORY-079 | ✅ done | (verify) |
| STORY-080 | ◐ partial — difficulty-scaled finding volume not implemented | matches |
| STORY-081 | ✅ done | (verify) |
| STORY-082 | ✅ done | (verify) |

Action: walk through every STORY-XXX.md and bring `## Status` block in line with the actual source.

### 3. Student-facing partial features (buildable now)

| Feature | Current state | Next step |
|---------|---------------|-----------|
| Quiz lesson transition | `LessonContent.tsx` shows "Interactive quiz, coming soon!" for QUIZ lessons | Wire `LessonContent` to `/courses/[slug]/quizzes/[quizId]` for QUIZ type |
| Live-class RSVP/attendance | Only admin CRUD exists | Build `/live-classes` student route + RSVP model |
| All-access entitlement | PricingTier exists, semantics not verified | Build an integration test proving AllAccess = all courses |
| Editable email templates | Entity + use cases exist, no admin page | Add `/admin/email-templates` page |
| Keyword Research credentials | All datasets `synthetic_calibrated`, credential-mode rejected | Curate ≥1 real dataset for a launch niche |
| Session revocation | JWT-only, no session-table lookup | Add `sessions` membership check or token version |
| Impersonation restore | First-time path signs out admin | Capture original token on first impersonation |
| Account deletion / data export | Profile display only | Build `/profile/data` actions |

### 4. Simulator grading owns `userId: "system"` (P1 from audit)
- Files affected: `src/app/tools/{bid-elevator,campaign-builder,str-triage,listing-audit}/actions.ts`
- Impact: attempts cannot be attributed to the submitting student
- Fix: thread the authenticated session userId into `runAttempt(...)`

### 5. Lesson-to-quiz transition still placeholder
- File: `src/app/courses/[slug]/lessons/[lessonId]/LessonContent.tsx`
- QUIZ content type renders text only
- Story: STORY-026 marked complete but acceptance criterion not met
- Fix: dispatch on lesson `type === "quiz"` to render link/embed to the quiz page

### 6. Dashboard pendingRefunds hardcoded
- File: `src/usecases/GetAdminDashboardStats.ts:127`
- Admin-only, but the audit flagged it as misleading
- Fix: query `prisma.order.count({ where: refundRequestedNotProcessed })`

### 7. Settings page variable name mismatch
- File: `src/app/admin/settings/page.tsx`
- Checks `PAYMONGO_SECRET_KEY` but env var is `PAYMONGO_SECRET`
- Fix: one-line correction

### 8. Live-class experience missing
- Admin has CRUD; students have nothing
- Required: `/live-classes` list page, RSVP, capacity, recording links, reminders
- This is the largest student-facing gap (no story file exists yet)

### 9. Account settings for students are partial
- Profile view exists; password change, notification preferences, and 2FA opt-in are missing for students (only admins have 2FA)
- Fix: build `/profile/security` route

---

## P2 — Documentation and test gaps that block shipping

### 10. E2E coverage missing for most student flows
- The original 6 critical journeys from STORY-055 are not visible in `tests/e2e/`
- Add: anonymous → signup → empty dashboard; lesson → quiz → pass; bid-elevator submit; etc.

### 11. README + architecture docs drift
- README still says "first deploy pending"
- `docs/api-reference.md`, `docs/db-schema.md`, `docs/architecture/01-layer-wiring.md` describe pre-shipped state
- Fix: regenerate these from current source

### 12. Documentation drift in FEATURES.md
- Lists "Implemented" for features that are actually partial or planned
- Should match audit-2026-07-27-completeness-review.md

---

## Work queue (ordered by student impact)

1. **Wire lesson-to-quiz transition** — every QUIZ lesson hits a placeholder today. PR-sized fix, tests included.
2. **Simulator ownership fix** — replace `userId: "system"` with real user in 4 actions. P1 from audit.
3. **Editable email templates admin page** — STORY-063 closed in code, blocked on admin UI.
4. **Live-class student experience** — biggest student gap. Needs story docs (STORY-090+) and full vertical slice.
5. **Student account settings** — password change, 2FA opt-in for students.
6. **Documentation refresh** — README, FEATURES.md, architecture docs.
7. **E2E test coverage** — at least the 6 critical journeys.

---

## Out of scope (explicitly)

- Multi-tenant organizations
- Subscription billing (all payment is one-time via PayMongo)
- Native mobile
- AI features
- Automated job-readiness decisions

---

## Recommended next session: STORY-090 series

Add four new story files that close the live-class student loop:

- **STORY-090**: Live-class list page (`/live-classes`)
- **STORY-091**: Live-class detail + RSVP (`/live-classes/[id]`)
- **STORY-092**: Live-class recording + post-class XP
- **STORY-093**: Student 2FA opt-in at `/profile/security`

Each is 1 point per the 1-point-per-story discipline. Sequenced in this order so STORY-090 unlocks the remaining two.