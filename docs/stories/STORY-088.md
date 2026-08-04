# STORY-088: Challenge progression

**Points:** 1 (sized), title-only entry with no acceptance criteria in `docs/sprint-plan.md`.
**Epic:** Sprint 16 — Assessment Platform Maturity.

## Status

**Status:** Done — 2026-08-04.

## Scope decision

The story had no acceptance criteria beyond its title. This session asked the user to choose
between two options, and the user picked the smaller one — **"Minimal real feature"**: a student
can pick Challenge mode for a simulator once they've passed that simulator at least once in
Practice mode, and passing a Challenge-mode attempt awards a one-time bonus XP. Explicitly out of
scope: a difficulty-tier unlock chain, badges, and a leaderboard.

## What was found

`SimulatorMode` (`"guided" | "practice" | "challenge" | "credential" | "instructor"`) was already
a valid value in every simulator action's Zod schema, but no UI ever set anything but
`"practice"` — `mode: "practice"` was hardcoded in all 5 forms' attempt calls. Challenge mode was
dead plumbing. Separately, no simulator-related `XPReason` existed at all — simulators were
entirely disconnected from the XP/gamification system regardless of mode.

## What shipped

- **Domain:** `XPEvent.ts` gains `"simulator_challenge_passed"` as a valid `XPReason`.
  `XPService.SIMULATOR_CHALLENGE_PASSED_XP = 25`.
- **Ports/adapters:** `ISimulatorAttemptRepository` gains `findByUserAndSimulator(userId,
simulatorId, options?)` — unlike the existing `findByUserAndScenario()`, this spans every
  scenario version and difficulty for that simulator, so publishing a new scenario version never
  resets a student's earned Challenge-mode eligibility. Implemented in both
  `PrismaSimulatorAttemptRepository` and `InMemorySimulatorAttemptRepository`, with tests.
- **Use case:** new `CheckChallengeModeUnlocked` (wired into both containers), backed by a
  standalone exported function `hasEverPassedSimulatorInMode()` — checks whether the student has
  any graded attempt for a given (simulatorId, mode) pair whose score met its `ScorePolicy`'s
  passing threshold. `CheckChallengeModeUnlocked` calls it with `mode: "practice"` to decide
  whether Challenge unlocks; the same function is reused by each simulator's action with `mode:
"challenge"` (and `excludeAttemptId` set to the attempt just graded) to gate the XP award to a
  student's _first_ Challenge-mode pass per simulator — without this check, replaying Challenge
  mode would farm the bonus XP indefinitely.
- **UI:** new shared `SimulatorModeToggle` component (Practice/Challenge radio buttons; Challenge
  is disabled with a lock icon and a tooltip until unlocked). Wired into all 5 simulator pages
  (server-side eligibility check via `container.checkChallengeModeUnlocked.execute()`) and all 5
  forms (client-side mode selection, replacing the hardcoded `"practice"`). Each action now
  returns `xpAwarded: number | null`, rendered as a small success banner in the result view when
  present.

## Fixed in passing

bid-elevator's and campaign-builder's returned `isPassed` field was a rough, disconnected
heuristic (`bidAccuracy >= 50`, `structureQuality >= 50`) instead of the real
`ScorePolicy`-derived pass/fail that `GradeSimulatorAttempt` already computes and
`ComposeAttemptFeedback` re-derives as `feedback.passed`. Both now use `feedback.passed` — the
same authoritative value the Challenge-mode XP gate depends on being correct, so this was fixed
as a direct prerequisite of the story rather than a drive-by cleanup.

## Known limitations (deliberately out of scope, per the chosen option)

- No difficulty-tier unlock chain — Challenge is unlocked at the simulator level, not per
  difficulty.
- No badge or leaderboard tied to Challenge mode.
- No UI surfaces _how many_ times a student has attempted Challenge mode, or a history of past
  Challenge attempts — only whether the current one just earned XP.

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test       # 339 files / 3622 passed / 2 skipped
pnpm test:arch    # 13 files / 633 passed
pnpm build        # succeeds
```
