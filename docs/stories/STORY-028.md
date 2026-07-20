# STORY-028 — `XPService` + XP Display on Dashboard

## Status

- **Story**: STORY-028
- **Sprint**: 6 — Lesson Delivery + Progress
- **Points**: 1
**Status:** ✅ Done (PR #28, commit `63fa4c7` — `feat(story-028): XPService + AwardXP use case`)

## Overview

Award XP (experience points) to users for completing lessons and courses. Display XP on the student dashboard.

XP rules:
- Complete a lesson: **10 XP**
- Complete a course: **+50 XP** bonus

## Domain Changes

### Prisma Schema — `XPEvent` table + `User.totalXp`

```prisma
model XPEvent {
  id        String   @id @default(cuid())
  userId    String
  amount    Int      // positive integer (XP earned)
  reason    String   // e.g. "lesson_completed", "course_completed", "quiz_passed"
  refId     String? // lessonId, courseId, quizAttemptId, etc.
  createdAt DateTime @default(now())

  @@index([userId])
}

model User {
  // ... existing fields ...
  totalXp   Int      @default(0)
}
```

### `XPEvent` Domain Entity

```typescript
// src/domain/entities/XPEvent.ts
export interface XPEvent {
  id: string;
  userId: string;
  amount: number;     // positive XP amount
  reason: string;     // "lesson_completed" | "course_completed" | "quiz_passed" | "streak_bonus"
  refId?: string;    // lessonId, courseId, etc.
  createdAt: Date;
}

export type CreateXPEventParams = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  refId?: string;
  createdAt: Date;
};

export function createXPEvent(params: CreateXPEventParams): Result<XPEvent, XPEventError>;
```

### `IXPEventRepository` Port

```typescript
// src/ports/repositories/IXPEventRepository.ts
export interface IXPEventRepository {
  create(event: XPEvent): Promise<Result<XPEvent, XPEventError>>;
  findByUserId(userId: string): Promise<Result<readonly XPEvent[], XPEventError>>;
}
```

### `User.totalXp` — Update `PrismaUserRepository`

Add `totalXp: Int @default(0)` to the User model in Prisma. Update `PrismaUserRepository.findById` to return `totalXp` field.

## Use Case: `AwardXP`

```typescript
// src/usecases/AwardXP.ts
export interface AwardXPInput {
  userId: string;
  amount: number;   // positive integer
  reason: string;    // "lesson_completed" | "course_completed" | "quiz_passed" | "streak_bonus"
  refId?: string;
}

export type AwardXPResult = Result<
  { xpEvent: XPEvent; totalXp: number },
  { kind: "user_not_found" } | { kind: "db_error"; message: string }
>;

export class AwardXP {
  async execute(input: AwardXPInput): Promise<AwardXPResult>;
}
```

**Rules:**
- `amount` must be > 0
- `reason` must be a valid XP reason
- User must exist (user_not_found error otherwise)
- XP is persisted as XPEvent + User.totalXp updated atomically (in a transaction)

## `XPService` — Domain Service

```typescript
// src/domain/services/XPService.ts
export class XPService {
  // XP awarded per action
  static readonly LESSON_XP = 10;
  static readonly COURSE_COMPLETE_BONUS_XP = 50;

  // Check if XP should be awarded for this reason
  static isXpReason(reason: string): boolean;

  // Calculate XP tier label
  static xpTierLabel(totalXp: number): "Newcomer" | "Learner" | "Achiever" | "Expert" | "Master";
}
```

## Integration with `MarkLessonComplete` (STORY-027)

When `MarkLessonComplete` emits a `lesson_completed` `ProgressEvent`, it should ALSO call `AwardXP.execute({ userId, amount: 10, reason: "lesson_completed", refId: lessonId })`.

When `MarkLessonComplete` emits a `course_completed` `ProgressEvent`, it should ALSO call `AwardXP.execute({ userId, amount: 50, reason: "course_completed", refId: courseId })`.

> Note: XP awarding is fire-and-forget from the student's perspective — if XP fails to save, the lesson completion still succeeds. Log errors.

## Dashboard XP Display

```typescript
// src/app/dashboard/DashboardXP.tsx
// (existing dashboard page: src/app/dashboard/page.tsx)
```

Display:
- Total XP: large number + tier badge
- Recent XP events: "+10 XP for completing Lesson Name"
- XP to next tier progress bar

## Code Shape

### New files
- `src/domain/entities/XPEvent.ts` — entity + factory
- `src/domain/services/XPService.ts` — static constants + tier logic
- `src/ports/repositories/IXPEventRepository.ts` — port interface
- `src/usecases/AwardXP.ts` — use case
- `src/infra/repositories/InMemoryXPEventRepository.ts` — test adapter
- `src/infra/repositories/PrismaXPEventRepository.ts` — Prisma adapter
- `tests/unit/domain/entities/XPEvent.test.ts`
- `tests/unit/domain/services/XPService.test.ts`
- `tests/unit/usecases/AwardXP.test.ts`

### Modified files
- `prisma/schema.prisma` — add XPEvent table + User.totalXp
- `src/infra/repositories/PrismaUserRepository.ts` — add totalXp
- `src/infra/repositories/InMemoryUserRepository.ts` — add totalXp
- `src/usecases/MarkLessonComplete.ts` — call AwardXP (fire-and-forget)

## Tests

1. `XPEvent.createXPEvent` — valid event, invalid amount (≤0)
2. `XPService.tierLabel` — all tiers
3. `AwardXP.execute` — valid award, user_not_found, invalid amount
4. `MarkLessonComplete` — verifies `AwardXP` is called for lesson + course completion

## Acceptance Criteria

- [ ] XPEvent entity + repository (in-memory + Prisma) — 2 repos, 0 existing
- [ ] `AwardXP` use case — user_not_found, valid award, atomic update
- [ ] `XPService` tier logic — 5 tiers
- [ ] `MarkLessonComplete` fires `AwardXP` for lesson (10 XP) and course (50 XP) — fire-and-forget
- [ ] `User.totalXp` in Prisma schema + repos
- [ ] Tests: 10+ new tests
