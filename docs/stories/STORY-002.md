# STORY-002 · Prisma schema + first repository (UserRepository + InMemoryUserRepository)

**Sprint:** 1
**Points:** 1
**Epic:** Foundation
**Owner:** Ryan
**Dependencies:** STORY-001
**Status:** ✅ Done (shipped in initial greenfield bootstrap; `prisma/schema.prisma` + `UserRepository` + `InMemoryUserRepository` all landed)

## Goal

Set up Prisma 7 with the `User` model, create the `UserRepository` port, implement `PrismaUserRepository` and `InMemoryUserRepository`. After this story, the project has a real database connection, a working repository pattern, and the `buildTestContainer()` scaffold that every use case test will use.

## Acceptance criteria

- [ ] `prisma/schema.prisma` defines the `User` model per `docs/db-schema.md` §"User" (id, email, emailVerifiedAt, passwordHash, displayName, role, currentStreakDays, longestStreakDays, lastStreakVisitAt, deletedAt, createdAt, updatedAt, createdById, updatedById).
- [ ] `prisma/migrations/0001_init/migration.sql` is generated and runs cleanly.
- [ ] `src/domain/users/User.ts` defines the `User` domain entity with `reconstitute(row)`, `create(input)`, and a private constructor that validates at construction.
- [ ] `src/ports/repositories/UserRepository.ts` defines the full interface per `docs/api-reference.md` §"UserRepository".
- [ ] `src/infra/db/prisma/PrismaUserRepository.ts` implements the port, with `toDomain(row)` and `toWriteInput(entity)` mappers. No `@prisma/client` types in the public signatures.
- [ ] `src/infra/db/inmemory/InMemoryUserRepository.ts` implements the same surface. Has a `__resetForTests()` method.
- [ ] `src/composition/testContainer.ts` exports `buildTestContainer(overrides?)` returning a container with `InMemoryUserRepository` and fakes for every other port.
- [ ] Integration test `src/infra/db/prisma/__tests__/PrismaUserRepository.test.ts` runs against a real Postgres (CI service container).
- [ ] Unit test `src/infra/db/inmemory/__tests__/InMemoryUserRepository.test.ts` covers every method, including edge cases (empty list, page boundaries, role filter, soft-delete filter).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Create |
| `prisma/migrations/0001_init/migration.sql` | Create (generated) |
| `src/domain/users/User.ts` | Create |
| `src/ports/repositories/UserRepository.ts` | Create |
| `src/infra/db/prisma/client.ts` | Create — singleton `PrismaClient` |
| `src/infra/db/prisma/PrismaUserRepository.ts` | Create |
| `src/infra/db/inmemory/InMemoryUserRepository.ts` | Create |
| `src/composition/testContainer.ts` | Create |
| `src/domain/users/__tests__/User.test.ts` | Create |
| `src/infra/db/prisma/__tests__/PrismaUserRepository.test.ts` | Create |
| `src/infra/db/inmemory/__tests__/InMemoryUserRepository.test.ts` | Create |

## Code shape

```ts
// src/domain/users/User.ts
import type { UserRole } from "./UserRole";

export type User = {
  readonly id: string;
  readonly email: string;
  readonly emailVerifiedAt: Date | null;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly currentStreakDays: number;
  readonly longestStreakDays: number;
  readonly lastStreakVisitAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdById: string | null;
  readonly updatedById: string | null;
};

export class UserEntity {
  private constructor(public readonly props: User) {}
  static create(input: {
    id: string; email: string; passwordHash: string; displayName: string;
  }): UserEntity {
    if (!input.email.includes("@")) throw new Error("Invalid email");
    if (input.displayName.length < 2 || input.displayName.length > 50) {
      throw new Error("Display name must be 2-50 chars");
    }
    const now = new Date();
    return new UserEntity({
      ...input,
      emailVerifiedAt: null,
      role: "STUDENT",
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastStreakVisitAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      createdById: null,
      updatedById: null,
    });
  }
  static reconstitute(props: User): UserEntity {
    return new UserEntity(props);
  }
  isAdmin(): boolean {
    return this.props.role === "ADMIN" || this.props.role === "SUPER_ADMIN";
  }
}
```

```ts
// src/composition/testContainer.ts
import { InMemoryUserRepository } from "@infra/db/inmemory/InMemoryUserRepository";
import { FixedClock } from "@infra/system/FixedClock";  // created in STORY-002 if not STORY-001
import { DeterministicIdGenerator } from "@infra/system/DeterministicIdGenerator";
import { ConsoleLogger } from "@infra/observability/ConsoleLogger";  // stub
import type { Container } from "./container";

export function buildTestContainer(overrides?: Partial<Container>): Container {
  const defaults: Container = {
    clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
    ids: new DeterministicIdGenerator("test"),
    logger: new ConsoleLogger(),
    users: new InMemoryUserRepository(),
    // ... every other port stubbed with a no-op fake
  };
  return { ...defaults, ...overrides };
}
```

## Pitfalls

- **`PrismaUserRepository` must not leak Prisma types.** The public methods return domain `User` entities, not Prisma row types. The mappers are the only place that knows both shapes.
- **`InMemoryUserRepository.list` must return `total`.** Don't lazy-implement. The contract requires both `rows` and `total` for pagination.
- **`UserEntity.create` validates at construction.** Empty email or out-of-range display name throws. This is a programmer-error throw, not a `Result.err`. It catches bugs in the use case, not user-facing failures.
- **`buildTestContainer()` returns the full `Container` type.** Even if a use case only depends on `users`, the rest of the ports are present (as no-op fakes) so the type checks. The use case tests override only the ports they care about.
- **Soft-delete filter.** `InMemoryUserRepository.list` and `findById` filter out `deletedAt != null` rows. Same as the real `PrismaUserRepository`. The test asserts this.
- **Migration file is generated.** `prisma migrate dev --name init` produces it. Don't hand-write unless `prisma migrate dev` fails (which would be a bug to fix, not work around).

## Verification

```bash
pnpm prisma:generate
pnpm prisma:migrate
DATABASE_URL=postgresql://test:test@localhost:5432/amph_test pnpm test
# Integration test: PrismaUserRepository against a real Postgres
# Unit test: InMemoryUserRepository
# Domain test: UserEntity
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `User` domain entity has `reconstitute(row)` and a validating constructor.
- [ ] `PrismaUserRepository` has no Prisma types in the public signatures.
- [ ] `InMemoryUserRepository` has a test that exercises every method, including edge cases.
- [ ] `buildTestContainer()` is exported and typed.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-002.md` exists (this file).
- [ ] Conventional commit: `feat(users): user model + repository port + prisma + inmemory impls (STORY-002)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
