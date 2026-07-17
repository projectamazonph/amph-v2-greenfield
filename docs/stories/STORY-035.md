# STORY-035 — Badge System (Domain + Use Cases)

## Status

- **Story**: STORY-035
- **Sprint**: 8 — Gamification / Badges + Certificates
- **Points**: 2
- **Status**: In Progress

## Overview

Build the badge system end-to-end: domain entities, repository ports, Prisma
schema, infra adapters, and use cases.

**Scope of this story:**
- `Badge` and `BadgeAward` domain entities
- `IBadgeRepository` + `IBadgeAwardRepository` ports
- `InMemoryBadgeRepository` + `InMemoryBadgeAwardRepository` fakes
- `PrismaBadgeRepository` + `PrismaBadgeAwardRepository` (with schema migration)
- `AwardBadge` use case — awards a badge to a user
- `ListUserBadges` use case — returns all badges a user has earned
- Both wired into the DI container

**Out of scope for this story (separate follow-ons):**
- Admin CRUD for badges (separate story — admin panel is a whole feature)
- Calling `AwardBadge` from other use cases (e.g. from `RecordQuizAttempt`)
  — the awarding triggers are separate stories
- Badge icons in the UI (Phosphor icon name is stored on the entity)

## 1. Domain Entities

### Badge

```typescript
// src/domain/entities/Badge.ts

export type BadgeSlug =
  | "first-quiz-pass"
  | "5-day-streak"
  | "all-3-courses-enrolled";

export interface Badge {
  readonly slug: BadgeSlug;
  readonly name: string;           // e.g. "First Quiz Pass"
  readonly description: string;    // e.g. "Passed your first quiz"
  readonly iconName: string;      // Phosphor icon name, e.g. "Trophy"
  readonly xpReward: number;       // bonus XP awarded alongside the badge
  readonly awardedAt?: never;     // Badge is a template — BadgeAward has the date
}

export function createBadge(params: {
  slug: BadgeSlug;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
}): Result<Badge, { kind: "invalid_slug" }>;
```

The badge slug is the primary key. Only pre-defined slugs are valid — no
arbitrary strings. A `Badge` is a template; `BadgeAward` is the per-user award
record.

### BadgeAward

```typescript
// src/domain/entities/BadgeAward.ts

export interface BadgeAward {
  readonly id: string;
  readonly userId: string;
  readonly badgeSlug: BadgeSlug;
  readonly awardedAt: Date;
}

export function createBadgeAward(params: {
  id: string;
  userId: string;
  badgeSlug: BadgeSlug;
  awardedAt: Date;
}): Result<BadgeAward, { kind: "already_awarded"; badgeSlug: BadgeSlug }>;
```

`createBadgeAward` returns `already_awarded` if the user already has this badge.
The repository layer also enforces this constraint (UNIQUE on userId + badgeSlug).

## 2. Repository Ports

```typescript
// src/ports/repositories/IBadgeRepository.ts

export interface IBadgeRepository {
  findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeError>>;
  findAll(): Promise<Result<readonly Badge[], BadgeError>>;
}

// src/ports/repositories/IBadgeAwardRepository.ts

export interface IBadgeAwardRepository {
  create(award: BadgeAward): Promise<Result<BadgeAward, BadgeAwardError>>;
  findByUserId(userId: string): Promise<Result<readonly BadgeAward[], BadgeAwardError>>;
  exists(userId: string, badgeSlug: BadgeSlug): Promise<Result<boolean, BadgeAwardError>>;
}
```

## 3. Prisma Schema Additions

```prisma
model Badge {
  slug        String   @id  // e.g. "first-quiz-pass"
  name        String
  description String
  iconName    String   // Phosphor icon name
  xpReward   Int      @default(0)
  awards     BadgeAward[]

  @@map("badges")
}

model BadgeAward {
  id        String   @id
  userId    String
  badgeSlug String
  awardedAt DateTime @default(now())
  badge     Badge    @relation(fields: [badgeSlug], references: [slug])

  @@unique([userId, badgeSlug])
  @@index([userId])
  @@map("badge_awards")
}
```

Run `prisma migrate dev` to generate the migration.

## 4. Use Cases

### AwardBadge

```typescript
// src/usecases/AwardBadge.ts

export interface AwardBadgeInput {
  userId: string;
  badgeSlug: BadgeSlug;
}

export type AwardBadgeError =
  | { kind: "badge_not_found" }
  | { kind: "already_awarded" }
  | { kind: "db_error"; message: string };

export type AwardBadgeResult = Result<
  { badgeAward: BadgeAward; xpAwarded: number },
  AwardBadgeError
>;

export interface AwardBadgeDeps {
  badgeRepo: IBadgeRepository;
  badgeAwardRepo: IBadgeAwardRepository;
  awardXpExecute: (params: { userId: string; amount: number; reason: "badge_awarded"; refId?: string }) => Promise<unknown>;
}
```

Flow:
1. Find badge by slug → `badge_not_found`
2. Check if already awarded → `already_awarded`
3. Create `BadgeAward` row
4. Award `badge.xpReward` XP (fire-and-forget via `awardXpExecute`)
5. Return `{ badgeAward, xpAwarded }`

### ListUserBadges

```typescript
// src/usecases/ListUserBadges.ts

export interface ListUserBadgesInput {
  userId: string;
}

export type ListUserBadgesError =
  | { kind: "db_error"; message: string };

export type ListUserBadgesResult = Result<
  { badges: readonly (Badge & { awardedAt: Date })[] },
  ListUserBadgesError
>;

export interface ListUserBadgesDeps {
  badgeRepo: IBadgeRepository;
  badgeAwardRepo: IBadgeAwardRepository;
}
```

Flow:
1. Fetch all awards for the user
2. For each award, fetch the badge template
3. Merge `Badge` + `awardedAt` into a combined view object

## 5. Container Wiring

```typescript
// In AppContainer:
badgeRepo: IBadgeRepository;
badgeAwardRepo: IBadgeAwardRepository;
awardBadge: AwardBadge;
listUserBadges: ListUserBadges;
```

Both use cases are constructed in `buildProductionContainer()` and
`buildTestContainer()`.

## 6. Tests

- `Badge` entity: create valid badge, invalid slug
- `BadgeAward` entity: create award, duplicate award → already_awarded
- `AwardBadge` use case: happy path, badge not found, already awarded
- `ListUserBadges` use case: no badges, one badge, multiple badges
- Container: both use cases wired and working

## 7. Files

| File | Change |
|---|---|
| `src/domain/entities/Badge.ts` | New — Badge entity |
| `src/domain/entities/BadgeAward.ts` | New — BadgeAward entity |
| `src/ports/repositories/IBadgeRepository.ts` | New |
| `src/ports/repositories/IBadgeAwardRepository.ts` | New |
| `src/infra/repositories/InMemoryBadgeRepository.ts` | New |
| `src/infra/repositories/InMemoryBadgeAwardRepository.ts` | New |
| `src/infra/repositories/PrismaBadgeRepository.ts` | New |
| `src/infra/repositories/PrismaBadgeAwardRepository.ts` | New |
| `src/usecases/AwardBadge.ts` | New |
| `src/usecases/ListUserBadges.ts` | New |
| `src/composition/container.ts` | Wire badge repos + use cases |
| `prisma/schema.prisma` | Add Badge + BadgeAward models |
| `prisma/migrations/` | New migration |
| `tests/unit/domain/entities/Badge.test.ts` | New |
| `tests/unit/domain/entities/BadgeAward.test.ts` | New |
| `tests/unit/usecases/AwardBadge.test.ts` | New |
| `tests/unit/usecases/ListUserBadges.test.ts` | New |
| `tests/unit/composition/container.test.ts` | Add badge wiring tests |
| `docs/stories/STORY-035.md` | This doc |

## 8. Design Decisions

- **`BadgeSlug` is a union type, not a string** — valid slugs are
  enumerated. This prevents typos and makes it easy to find all
  places a badge is referenced. A `createBadge` that receives an
  unknown slug returns `invalid_slug`.
- **`Badge` is a template, `BadgeAward` is the event** — this is the
  classic template/event pattern. A badge can be described once and
  awarded many times. The badge's `xpReward` is on the template, not
  the award.
- **XP is fire-and-forget on award** — `AwardBadge` calls
  `awardXpExecute` wrapped in `.catch()` so XP failures don't prevent
  the badge from being recorded.
- **`already_awarded` is checked at the domain level AND at the repo
  level** — the domain guard makes the use case idempotent (safe to
  retry); the DB UNIQUE constraint is the last line of defence.
