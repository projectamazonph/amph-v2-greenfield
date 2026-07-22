# STORY-011 — Course + Module + Lesson + PricingTier models + repos

**Sprint:** 3
**Points:** 1
**Epic:** Catalog
**Owner:** Ryan
**Status:** In progress

## Goal

Lay down the persistence foundation for the course catalog: a `PricingTier`
domain concept (pricing is on the tier, not on the course — see
`docs/db-schema.md` §PricingTier), plus the public-facing `Course` repository
contract surfaced through a `PricingTierRepository` port. The existing
`Course` / `Module` / `Lesson` schemas and adapters already ship in main
(via PR #129 + earlier work), so this story fills the remaining gap: the
`PricingTier` row + port + adapters + tests, plus a small contract tweak on
`CourseRepository` so callers can ask "what pricing tier does this course
use?" through the existing `Course.curriculum` JSON without a breaking
schema change.

## Scope (what this story ships)

- `PricingTier` Prisma model + migration.
- `src/domain/entities/PricingTier.ts` — `PricingTier` interface,
  `createPricingTier()` factory, `pricingTierIsActive()` guard.
- `src/ports/repositories/IPricingTierRepository.ts` — port.
- `src/infra/repositories/InMemoryPricingTierRepository.ts` — test adapter.
- `src/infra/repositories/PrismaPricingTierRepository.ts` — production
  adapter, `CONCURRENTLY`-safe.
- `AppContainer` exposes `pricingTierRepo` (both `buildProductionContainer()`
  and `buildTestContainer()`).
- `docs/sprint-3/PLAN.md` — the rest of Sprint 3 so the next session can
  pick up STORY-012/013/014/015 with full context.
- Tests:
  - `src/domain/entities/__tests__/PricingTier.test.ts` — factory +
    guard branches.
  - `src/infra/repositories/__tests__/InMemoryPricingTierRepository.test.ts`
    — every method + the seed helper.
  - `src/infra/repositories/__tests__/PrismaPricingTierRepository.test.ts`
    — every method, soft-delete semantics, slug-uniqueness mapping,
    hand-rolled-fake-PrismaClient pattern (matches the P0-2 fixes).

## Out of scope (follow-up stories)

- **FK wiring on `Course` and `Enrollment`** — `Course.pricingTierId` and
  `Enrollment.pricingTierId` are documented in `docs/db-schema.md` but
  adding them is a breaking change to checkout (every `Order` row carries
  a `courseId` and a copy of the price; the FK migration needs a
  data-backfill strategy and an order-pricing snapshot pattern). That
  belongs to STORY-015 (pricing page + early-bird logic), which is the
  first story that needs the FK to actually render. Defer the FK swap;
  `Course.curriculum` JSON keeps working until then.
- **Admin CRUD for pricing tiers** (`/admin/pricing-tiers/*`,
  `AdminListPricingTiers` / `AdminCreatePricingTier` / etc.) — those
  use cases belong to a separate admin-panel story, parallel to
  STORY-050d (discount codes) and STORY-050e (badges).
- **Pricing-page UI** (`/pricing`) — STORY-015.

## Domain model

```ts
// src/domain/entities/PricingTier.ts

export type PricingTierStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface PricingTier {
  readonly id: string;
  readonly slug: string; // e.g. "foundations", "mastery", "ultimate", "all-access"
  readonly name: string;
  readonly price: Money; // integer minor units, never `number` for math
  readonly status: PricingTierStatus;
  readonly displayOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreatePricingTierError =
  { kind: "invalid_slug" } | { kind: "invalid_name" } | { kind: "invalid_price" };

export function createPricingTier(params: {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency?: string;
  status?: PricingTierStatus;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<PricingTier, CreatePricingTierError>;
```

- `slug` rules match `Course.slug` (kebab-case, lowercase, no
  consecutive hyphens, no leading/trailing hyphen).
- `priceMinor` must be `>= 0`. Free tiers are allowed (priceMinor = 0).
- `status` defaults to `"DRAFT"`. `pricingTierIsActive(tier)` returns
  true only when `status === "ACTIVE"`.
- Soft-delete is encoded as `status === "ARCHIVED"`, matching the
  schema doc's `deletedAt` column (which we treat as the
  `ARCHIVED` state in code, same convention as `CourseArchive`).

## Port

```ts
// src/ports/repositories/IPricingTierRepository.ts

export type PricingTierRepositoryError =
  { kind: "not_found" } | { kind: "slug_taken" } | { kind: "db_error"; message: string };

export interface IPricingTierRepository {
  listAll(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>>;
  listActive(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>>;
  findById(id: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>>;
  findBySlug(slug: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>>;
  create(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>>;
  update(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>>;
  archive(id: string): Promise<Result<PricingTier, PricingTierRepositoryError>>;
}
```

- `listAll()` excludes `ARCHIVED` tiers (the admin "show archived" toggle
  is a separate use case, not a port method).
- `findById()` and `findBySlug()` return `null` for both "not found" and
  "archived", matching `DiscountCode`'s convention.
- `update()` enforces slug uniqueness excluding the current tier.
- `archive()` is idempotent: re-archiving an already-`ARCHIVED` tier
  returns the existing tier.

## Code shape

```
prisma/
  schema.prisma                                       (modify)
  migrations/20260722050000_pricing_tier/
    migration.sql                                     (new)
src/
  domain/
    entities/
      PricingTier.ts                                  (new)
      __tests__/PricingTier.test.ts                   (new)
  ports/
    repositories/
      IPricingTierRepository.ts                       (new)
  infra/
    repositories/
      InMemoryPricingTierRepository.ts                (new)
      PrismaPricingTierRepository.ts                  (new)
      __tests__/
        InMemoryPricingTierRepository.test.ts         (new)
        PrismaPricingTierRepository.test.ts           (new)
  composition/
    container.ts                                      (modify — wire pricingTierRepo)
    container.test.ts                                 (modify — wire test repo)
docs/
  stories/
    STORY-011.md                                      (this file)
  sprint-3/
    PLAN.md                                           (new)
```

## Pitfalls

- **Soft-delete convention**: this codebase already uses
  `status = "ARCHIVED"` (Course, LiveClass) and `archivedAt` columns
  (DiscountCode, SimulatorScenario) inconsistently. `PricingTier` follows
  the `status` pattern to match `Course` and `LiveClass`. Don't add an
  `archivedAt` column here.
- **`slug` reuse across tiers**: `slug` is unique across ALL tiers,
  including archived ones (same as `Course.slug` and `DiscountCode.code`).
  Re-creating a tier with a previously-archived slug returns
  `slug_taken`.
- **`listAll()` filters archived out** but the public pricing page
  eventually needs both. `listActive()` is a convenience alias for
  `listAll()` (same SQL today, kept separate so the public-page future
  change is one method swap, not a breaking port change).
- **No FK on `Course` yet**: this story does NOT add `Course.pricingTierId`.
  Doing so forces a data backfill + a cascade-delete decision that
  belongs to STORY-015.
- **Money is in the domain**: the entity holds `price: Money`, not a
  `number`. The Prisma adapter splits it into `priceMinor: Int` +
  `currency: String` on the way out, the same way `Course` does.

## Definition of Done

- [x] All files in "Code shape" are present.
- [x] `PricingTier` factory covered by tests (happy + every error branch).
- [x] `InMemoryPricingTierRepository` covered (every method, archive
      idempotency, slug-uniqueness).
- [x] `PrismaPricingTierRepository` covered (every method, soft-delete
      via `status = "ARCHIVED"`, P2002 → `slug_taken`, P2025 →
      `not_found`).
- [x] `AppContainer` exposes `pricingTierRepo` in both
      `buildProductionContainer()` and `buildTestContainer()`.
- [x] `docs/sprint-3/PLAN.md` exists.
- [x] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:arch &&
    pnpm build` all green.
- [x] Conventional commit: `feat(catalog): STORY-011 PricingTier model +
    repo`.
- [x] PR opened against `main`. CI green. Squash merge.
- [x] `SESSION-HANDOVER.md` updated.
