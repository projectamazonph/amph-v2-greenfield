# STORY-100: Live-class recording + post-class XP

**Points:** 1
**Epic:** Student-facing gap closure (`docs/sprint-plan.md`'s Sprint-16-adjacent
"Student-facing gap closure" section lists this as "STORY-092" — that ID was
already in use in `docs/stories/STORY-092.md` for a shipped, unrelated story
("Certificate admin list, detail, and revoke"). Renumbered to STORY-100 —
the same collision-avoidance precedent STORY-097 set when STORY-093 turned
out to already mean something else. `docs/sprint-plan.md`'s row now points
here.)

## Status

**Status:** Done — 2026-08-03.

## Goal

A completed live class had no way to post a recording, and there was no XP
reward for watching one — so RSVPing to a session and then missing it (or
catching the replay) earned nothing, even though `RegistrationStatus`
already declared `"attended"` as a value nothing ever wrote.

## What shipped

- `LiveClass.recordingUrl: string | null` — new domain field, set via the
  existing `updateLiveClass()` patch path (`UpdateLiveClassPatch.recordingUrl`).
  Passing a valid URL sets/replaces it; an empty string clears it; omitting
  the key leaves it unchanged. New `invalid_recording_url` error kind.
  Migration `20260803020000_live_class_recording` adds the column
  (`live_classes.recordingUrl`, nullable — existing rows are unaffected).
- `LiveClassRegistration.watchedRecordingAt: Date | null` — new domain field,
  plus a `markRecordingWatched(reg, now)` helper that also flips `status` to
  `"attended"` (the first real writer of that previously-declared-but-dead
  enum value). Same migration adds
  `live_class_registrations.watchedRecordingAt`.
- `XPService.LIVE_CLASS_ATTENDED_XP = 15` and a new `"live_class_attended"`
  `XPReason` (added in the three places that currently have to be kept in
  sync by hand: `XPEvent.ts`'s `VALID_XP_REASONS`, `XPEvent.ts`'s `XPReason`
  union, and `XPService.isXpReason()`).
- `MarkLiveClassRecordingWatched` use case (`src/usecases/MarkLiveClassRecordingWatched.ts`):
  validates the class exists, is `"completed"`, and has a `recordingUrl`;
  validates the caller has a non-cancelled RSVP row; is idempotent (a second
  call returns the existing registration without re-awarding XP); awards XP
  fire-and-forget on the AwardXP pattern `AwardBadge` already established
  (inject a shared `AwardXP` instance, `.catch()` + `console.error`, never
  block the primary result on the XP call).
- `PrismaLiveClassRegistrationRepository` (`src/infra/repositories/`) — a
  **real prerequisite this story surfaced**: `buildProductionContainer()`
  was still wiring `InMemoryLiveClassRegistrationRepository`, meaning every
  RSVP (and the new watched-recording idempotency guard) vanished on cold
  start/redeploy on Vercel, per the existing gap CLAUDE.md already flagged.
  Built the Prisma adapter (mirrors `PrismaLiveClassRepository`'s style
  exactly) and swapped it into `buildProductionContainer()`. This closes
  that specific "known gap" line in CLAUDE.md.
- Server action `markLiveClassRecordingWatchedAction` and client component
  `LiveClassRecordingButton` (opens the recording, then marks it watched),
  both mirroring the existing `liveClassRsvp.action.ts` /
  `LiveClassRsvpButton.tsx` shapes. Wired into `/live-classes/[id]`'s
  `isCompleted` branch (previously just `<p>This class has ended.</p>`).
- Admin edit page (`/admin/live-classes/[id]/edit`) gained a "Recording URL"
  text input.
- **Found and fixed in passing:** `buildTestContainer()` (`container.test.ts`)
  was constructing three separate fresh `InMemoryLiveClassRegistrationRepository()`
  instances for `listLiveClassesForStudent`, `rsvpLiveClass`, and
  `cancelLiveClassRsvp`, instead of sharing the single `liveClassRegistrationRepo`
  instance already exposed on the container. An RSVP created through one of
  those use cases in a test built by `buildTestContainer()` was invisible to
  the others and to `container.liveClassRegistrationRepo` directly — silent
  because nothing had previously needed two of those three use cases to see
  the same state in one test. Found while wiring this story's use case,
  which does need to see RSVPs `rsvpLiveClass` created. All four now share
  one instance, matching production's wiring.

## Known limitations

- XP is awarded for the student clicking "mark as watched" after opening the
  recording link, not for actually watching it — same trust model the
  in-person "attended" status would have needed anyway (there was never a
  real attendance-tracking mechanism, only the unused enum value).
- No admin UI shows RSVP counts or per-student attendance
  (`docs/admin-backend.md`'s description of the live-classes admin table
  having "capacity, RSVPs, attended, required tier, recording status"
  columns remains aspirational, not built here — out of scope for this
  story).

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
pnpm prisma:validate
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test   # 3498 passed / 2 skipped (up from 3464/2 baseline)
pnpm test:arch  # 614/614
pnpm build      # succeeds
```
