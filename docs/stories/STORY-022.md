# STORY-022 — `AccessPolicy` Port + `TierAccessPolicy` Implementation

## Status

- **Story**: STORY-022
- **Sprint**: 5 — Enrollment + Access Policy
- **Points**: 1
**Status:** ✅ Done (PR #22, commit `e5c2df6` — `feat(story-022): AccessPolicy port + TierAccessPolicy implementation`)

## Overview

Define the `IAccessPolicy` port and implement the `TierAccessPolicy` use case. The access policy answers the single question every lesson page must ask: *"Can this user view this course?"*

## Domain Model

### Course Access Tier

Every course has an **access tier**. Tiers are ordered: `STARTER < PRO`.

- `STARTER`: Covered by STARTER or PRO subscription. Direct enrollment also grants access.
- `PRO`: Covered by PRO subscription only. Direct enrollment also grants access.
- `PREVIEW`: No subscription required. Any logged-in user can access a limited preview (first N lessons of the first section). Full access requires enrollment or matching subscription.

### Access Decision

```
ALLOWED                — full access
ALLOWED_PREVIEW        — tier too low, preview only
DENIED_TIER            — subscription tier too low
DENIED_NOT_ENROLLED    — tier OK but not enrolled
DENIED_NOT_AUTHENTICATED — anonymous user
```

## Architecture

```
domain/
  values/
    CourseAccessTier.ts   # STARTER | PRO | PREVIEW
    AccessDecision.ts     # ALLOWED | ALLOWED_PREVIEW | DENIED_*

ports/
  access/
    IAccessPolicy.ts      # canAccess(userId, courseId): Promise<AccessDecision>

usecases/
  CheckCourseAccess.ts   # thin use-case shell calling IAccessPolicy

infra/
  access/
    TierAccessPolicy.ts   # real impl — queries User + Course repos
    StubAccessPolicy.ts  # test double
```

## Ports

### `IAccessPolicy`

```typescript
interface IAccessPolicy {
  canAccess(userId: string, courseId: string): Promise<AccessDecision>;
}
```

### `AccessDecision` (domain value)

```typescript
type AccessDecision =
  | { kind: "allowed" }
  | { kind: "allowed_preview"; previewLessonCount: number }
  | { kind: "denied_tier"; userTier: string; requiredTier: string }
  | { kind: "denied_not_enrolled" }
  | { kind: "denied_not_authenticated" };
```

### `CourseAccessTier` (domain value)

```typescript
type CourseAccessTier = "STARTER" | "PRO" | "PREVIEW";

const TIER_LEVEL: Record<CourseAccessTier, number> = {
  PREVIEW: 0,
  STARTER: 1,
  PRO: 2,
};

/**
 * Maps a User.subscriptionTier to the equivalent CourseAccessTier level.
 * FREE users have no tier access.
 */
function subscriptionMeetsCourseTier(
  subscriptionTier: "FREE" | "STARTER" | "PRO",
  courseTier: CourseAccessTier,
): boolean;
```

> Users with `STARTER` tier satisfy `STARTER` and `PREVIEW` courses.
> Users with `PRO` tier satisfy all course tiers.
> Users with `FREE` tier satisfy only `PREVIEW` courses.

## Business Rules

1. Anonymous users → `DENIED_NOT_AUTHENTICATED`
2. Course not found → `DENIED_NOT_AUTHENTICATED` (don't leak existence of unpublished courses)
3. Course not published → `DENIED_NOT_AUTHENTICATED`
4. User enrolled in course → `ALLOWED`
5. User's subscription tier satisfies course tier → `ALLOWED`
6. User's tier is below course tier but course is PREVIEW → `ALLOWED_PREVIEW` (with previewLessonCount)
7. User's tier is below course tier, not enrolled → `DENIED_TIER`
8. User's tier satisfies course tier but not enrolled → `DENIED_NOT_ENROLLED`

## Prisma Schema Extension

Add `courseTier` field to `Course` model (Future story will add a migration):

```prisma
model Course {
  // ... existing fields ...

  // Access
  courseTier       String   @default("STARTER")  // STARTER | PRO | PREVIEW
  previewLessonCount Int    @default(1)           // how many lessons visible in preview

  @@map("courses")
}
```

> For now, `TierAccessPolicy` reads `courseTier` from the domain `Course` entity.
> The domain entity will be extended in STORY-011 (Sprint 3) or STORY-024.

## Tests

### Domain values

- `subscriptionMeetsCourseTier`: all 9 combinations (3 subscription × 3 course tier)
- `AccessDecision`: each variant has correct `kind`

### `TierAccessPolicy` (infra test + use case)

- **enrolled user**: `ALLOWED` regardless of tier
- **PRO user, PRO course**: `ALLOWED`
- **PRO user, STARTER course**: `ALLOWED`
- **STARTER user, STARTER course**: `ALLOWED`
- **STARTER user, PRO course, not enrolled**: `DENIED_TIER`
- **STARTER user, PRO course, enrolled**: `ALLOWED`
- **FREE user, PREVIEW course**: `ALLOWED_PREVIEW`
- **FREE user, STARTER course**: `DENIED_TIER`
- **anonymous user**: `DENIED_NOT_AUTHENTICATED`
- **unknown course**: `DENIED_NOT_AUTHENTICATED`
- **unpublished course**: `DENIED_NOT_AUTHENTICATED`

## Non-Goals

- No page routing logic in this story
- No caching — access checks hit the DB each time (cache layer is a future story)
- No Prisma migration — domain entity extended only (migration added in a follow-up)
