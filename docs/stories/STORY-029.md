# STORY-029 — `StreakService` + Streak Visit Recording

## Status

- **Story**: STORY-029
- **Sprint**: 6 — Lesson Delivery + Progress
- **Points**: 1
- **Status**: In Progress

## Overview

Track daily visit streaks for students. When they visit the dashboard, record the visit and update their streak. Award XP bonuses on streak milestones.

Streak rules:
- Visit every day → streak continues
- Miss a day → streak resets to 1
- Milestones: 7 days (+25 XP), 30 days (+100 XP), 100 days (+500 XP)
- Streak milestone XP is fire-and-forget (errors don't affect the page render)

## Schema Changes

```prisma
model UserStreak {
  id             String   @id @default(cuid())
  userId         String   @unique
  currentStreak  Int      @default(1)  // consecutive days
  longestStreak  Int      @default(1)  // all-time best
  lastVisitDate  DateTime @default(now()) // date only (time stripped)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("user_streaks")
}
```

## StreakService — Domain Logic

```typescript
// src/domain/services/StreakService.ts

export interface StreakMilestone {
  streak: number;
  label: string;
  xpBonus: number;
  achieved: boolean;
}

export class StreakService {
  /** Milestone definitions */
  static readonly MILESTONES: readonly StreakMilestone[] = [
    { streak: 7,   label: "7-Day Streak",  xpBonus: 25,  achieved: false },
    { streak: 30,  label: "30-Day Streak", xpBonus: 100, achieved: false },
    { streak: 100, label: "Century",        xpBonus: 500, achieved: false },
  ];

  /**
   * Given the previous streak data, compute the new streak after a visit on `visitDate`.
   * Returns updated streak info including whether a milestone was just hit.
   */
  static computeStreakUpdate(
    lastVisitDate: Date | null,
    currentStreak: number,
    longestStreak: number,
    visitDate: Date,
  ): {
    newStreak: number;
    newLongest: number;
    milestoneHit: StreakMilestone | null;
  };

  /** Get all milestone statuses for a given streak */
  static getMilestones(currentStreak: number): StreakMilestone[];

  /** Check if two dates are on consecutive calendar days */
  static isConsecutiveDay(a: Date, b: Date): boolean;

  /** Strip time component from a Date (set to midnight UTC) */
  static stripTime(date: Date): Date;
}
```

## Use Case: `RecordStreakVisit`

```typescript
// src/usecases/RecordStreakVisit.ts

export interface RecordStreakVisitInput {
  userId: string;
  visitDate: Date; // usually Date.now() but passed in for testability
}

export type RecordStreakVisitResult = Result<
  {
    currentStreak: number;
    longestStreak: number;
    milestoneHit: StreakMilestone | null;
  },
  { kind: "db_error"; message: string }
>;

export class RecordStreakVisit {
  async execute(input: RecordStreakVisitInput): Promise<RecordStreakVisitResult>;
}
```

**Rules:**
1. Find or create UserStreak record for user
2. Strip time from `visitDate` and `lastVisitDate`
3. If `lastVisitDate === visitDate` (same day revisit): return current streak (no change)
4. If `lastVisitDate` is yesterday: `currentStreak++`
5. If `lastVisitDate` is older: `currentStreak = 1`
6. Update `longestStreak = max(longestStreak, currentStreak)`
7. Check for milestone hit: did we just reach 7, 30, or 100 days?
8. Persist updated UserStreak
9. If milestone hit → award streak XP (fire-and-forget via `AwardXP`)

## Dashboard Integration

```typescript
// src/app/dashboard/page.tsx (or a Server Component)
// On dashboard render:
// 1. Call RecordStreakVisit.execute({ userId, visitDate: new Date() })
// 2. Get streak info + milestone
// 3. Display streak widget
```

## Code Shape

### New files
- `src/domain/services/StreakService.ts` — domain logic
- `src/usecases/RecordStreakVisit.ts` — use case
- `src/ports/repositories/IUserStreakRepository.ts` — port interface
- `src/infra/repositories/InMemoryUserStreakRepository.ts` — test adapter
- `src/infra/repositories/PrismaUserStreakRepository.ts` — Prisma adapter
- `tests/unit/domain/services/StreakService.test.ts`
- `tests/unit/usecases/RecordStreakVisit.test.ts`

### Modified files
- `prisma/schema.prisma` — add UserStreak table

## Tests

1. `StreakService.computeStreakUpdate`:
   - First visit ever → streak = 1, no milestone
   - Consecutive day → streak +1, milestone at day 7
   - Same day revisit → no change
   - Miss a day → streak resets to 1
   - New longest streak recorded
   - Milestone hit: 7-day, 30-day, 100-day
   - Milestone not hit on non-milestone days

2. `StreakService.getMilestones`:
   - All 3 milestones returned with correct achieved status

3. `RecordStreakVisit`:
   - First visit: streak = 1
   - Consecutive day: streak increases
   - Same day: no change
   - Streak reset: goes back to 1
   - Milestone awarded on day 7
   - Milestone XP awarded (calls AwardXP fire-and-forget)

## Acceptance Criteria

- [ ] StreakService.computeStreakUpdate — all cases covered
- [ ] UserStreak repository (in-memory + Prisma)
- [ ] RecordStreakVisit use case
- [ ] Dashboard integration (calls RecordStreakVisit on render)
- [ ] AwardXP integration for milestone bonuses
- [ ] Tests: 15+ new tests
