# STORY-091 — Live-class detail + RSVP

**Type:** feat
**Pts:** 1
**Status:** Done

## Why

The audit in `docs/STUDENT-FEATURE-GAP-ANALYSIS.md` listed the live-class student experience as the second-largest student-facing gap. The `SendLiveClassReminders` cron could email students, but no student-facing route let them confirm attendance. This is the second half of the gap fix.

## What changed

- `src/app/live-classes/[id]/page.tsx` — new server component. Shows class metadata, status badge, and an RSVP / Cancel button. Enforces enrollment gate (button hidden for non-enrolled users on non-cancelled classes).
- `src/app/live-classes/[id]/page.module.css` — Field Manual tokens. Card wrapper, dl/dt/dd meta grid, status row at top.
- `src/app/live-classes/[id]/loading.tsx` — loading skeleton.
- `src/components/student/LiveClassRsvpButton.tsx` — client component. Uses `useTransition` + server actions.
- `src/app/actions/liveClassRsvp.action.ts` — two server actions.
- `src/usecases/RsvpLiveClass.ts` — new use case.
- `src/usecases/CancelLiveClassRsvp.ts` — new use case.
- Tests covering all four Rsvp paths and three Cancel paths.

## Acceptance Criteria

- [x] `/live-classes/[id]` shows class title, scheduled time, duration, status badge.
- [x] Enrolled students see the RSVP / Cancel button.
- [x] Non-enrolled students see a "must enroll" notice and a Browse courses link.
- [x] Cancelled or completed classes disable RSVP.
- [x] RSVP is idempotent.
- [x] Cancelled RSVPs can be re-registered.
- [x] Both server actions call `revalidatePath` for `/live-classes`, `/live-classes/[id]`, and `/dashboard`.

## Files touched

- New: `src/app/live-classes/[id]/page.tsx`, `page.module.css`, `loading.tsx`
- New: `src/app/actions/liveClassRsvp.action.ts`
- New: `src/components/student/LiveClassRsvpButton.tsx`
- New: `src/usecases/RsvpLiveClass.ts`
- New: `src/usecases/CancelLiveClassRsvp.ts`
- New: `src/usecases/__tests__/RsvpLiveClass.test.ts`

## Pitfalls

- The button uses `useTransition` so the page does not fully re-render while the server action is in flight. The page re-renders after the action finishes via `revalidatePath`.

## Verification

- `pnpm test src/usecases/__tests__/RsvpLiveClass.test.ts` — 8 tests.
- `pnpm tsc --noEmit`.