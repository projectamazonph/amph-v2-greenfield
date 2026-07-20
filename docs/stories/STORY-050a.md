# STORY-050a: AuditLog port + write sites for refund override + admin course CRUD

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-049 (refund override), STORY-048 (admin CRUD)
**Blocks:** STORY-050b/c/d/e (the rest of the 050 split)

## Status

- **Story**: STORY-050a
- **Sprint**: 10 — Admin panel
- **Points**: 1
**Status:** ✅ Done (PR #050a, commit `e9b5caa` — `feat(admin): STORY-050a audit log port + write sites`)

## Why split STORY-050

The original STORY-050 packed **five** distinct surfaces into 1 story:

1. **Simulators** (scenario CRUD)
2. **Live classes** (CRUD)
3. **Discount codes** (admin CRUD; the student-side use case exists)
4. **Badges** (admin CRUD; the student-side use case exists)
5. **AuditLog** (port + write sites + admin viewer)
6. **Settings** (admin config)

That's ~3 stories of work by the plan's own threshold (~150 lines / 1 pt). Splitting into 5 sub-stories so each ships in a 1-pt PR.

| Story | Scope | Status |
|-------|-------|--------|
| **STORY-050a (this)** | **AuditLog port + InMemory adapter + write sites for refund override + admin course CRUD** | shipped |
| STORY-050b | Simulators (scenario CRUD) | pending |
| STORY-050c | Live classes (CRUD) | pending |
| STORY-050d | Discount codes (admin CRUD) | pending |
| STORY-050e | Badges (admin CRUD) + settings | pending |

## Goal

Introduce the `IAuditLog` port + an `InMemoryAuditLog` adapter. Wire write sites for:

1. **Refund override** (STORY-049) — the most critical: the override reason + admin id must be logged for compliance
2. **Admin course CRUD** (STORY-048a) — create / update / archive on a Course
3. (Optional) Admin module CRUD + lesson CRUD (STORY-048b/c)

The `PayMongoAdapter` is a stub for prod (we don't have a Prisma AuditLog table). The InMemory adapter is the test adapter.

After 050a, all the prior "TODO: log to AuditLog" comments in the use cases can be filled in (in follow-up stories) by injecting the audit log use case and calling it on the relevant branches.

## Scope decisions (to keep 050a to 1 pt)

- **InMemory adapter only** — no Prisma migration. The prod container falls back to InMemoryAuditLog for now.
- **Write sites, not reader** — the admin viewer page (with filters + search) is out of scope; lands with the next AuditLog follow-up. For 050a, the port only needs `record()`.
- **3 critical write sites** — RefundOverride + admin course create/update/archive. Module + lesson audit logs land in 050b/c.
- **No audit log of course/module/lesson reads** — only writes. Reads are too noisy and don't have a clear use case yet.

## Acceptance Criteria

### Domain (NEW)

- [ ] `src/domain/values/AuditAction.ts`: the discriminator for what was done
  - String union of `course.created`, `course.updated`, `course.archived`, `module.created`, `module.updated`, `module.deleted`, `module.reordered`, `lesson.created`, `lesson.updated`, `lesson.deleted`, `lesson.reordered`, `refund.processed`, `refund.overridden`, `user.impersonated`, etc.
  - Just a type + constants — no entity, no factory
- [ ] `src/domain/entities/AuditLogEntry.ts`: the entry
  - `AuditLogEntry` interface: `{ id, actorId, action, targetType, targetId, metadata, occurredAt }`
  - `createAuditLogEntry(params)` factory — validates actorId + action + targetType + targetId

### Port (NEW)

- [ ] `src/ports/repositories/IAuditLog.ts`:
  - `record(entry: AuditLogEntry): Promise<Result<void, AuditLogError>>`
  - `AuditLogError` union: `db_error`

### Infra (NEW)

- [ ] `src/infra/repositories/InMemoryAuditLog.ts`: implements `record`
- [ ] `src/infra/repositories/PrismaAuditLog.ts`: stub (throws unimplemented) — same pattern as `PrismaLessonRepository`

### Use cases (NEW)

- [ ] `src/usecases/RecordAuditLog.ts`: thin wrapper over `IAuditLog.record`
  - Input: `{ actorId, action, targetType, targetId, metadata? }`
  - Output: `{ entry: AuditLogEntry }`
  - Auto-assigns `id` (via idGen), `occurredAt` (via clock)
  - **Never returns an error** — the use case catches `db_error` and logs to console.error (audit logging must never fail the business operation)

### Tests (NEW)

- [ ] `src/domain/entities/__tests__/AuditLogEntry.test.ts` — entity factory
- [ ] `src/infra/repositories/__tests__/InMemoryAuditLog.test.ts` — repo contract
- [ ] `src/usecases/__tests__/RecordAuditLog.test.ts` — use case (focus on the "never fails" guarantee)

### Write sites (MODIFIED)

- [ ] `src/usecases/RefundOverride.ts`: after the `order.markRefunded` + persist, record an entry with action `refund.overridden`, metadata `{ overrideReason, amountMinor, userId, courseId }`
- [ ] `src/usecases/CreateCourse.ts`: record `course.created` after persist
- [ ] `src/usecases/UpdateCourse.ts`: record `course.updated` with a small diff metadata
- [ ] `src/usecases/ArchiveCourse.ts`: record `course.archived` with `wasAlreadyArchived` flag

### Container (MODIFIED)

- [ ] `src/composition/container.ts`: add `recordAuditLog` use case + `auditLog` port (InMemory prod)
- [ ] `src/composition/container.test.ts`: same in the test container
- [ ] Update `RefundOverride`, `CreateCourse`, `UpdateCourse`, `ArchiveCourse` constructors to accept `recordAuditLog` dep

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 1221 + new tests passing
- [ ] `pnpm build` succeeds

## Files to Create

```
src/domain/values/AuditAction.ts
src/domain/entities/AuditLogEntry.ts
src/ports/repositories/IAuditLog.ts
src/infra/repositories/InMemoryAuditLog.ts
src/infra/repositories/PrismaAuditLog.ts
src/usecases/RecordAuditLog.ts
src/domain/entities/__tests__/AuditLogEntry.test.ts
src/infra/repositories/__tests__/InMemoryAuditLog.test.ts
src/usecases/__tests__/RecordAuditLog.test.ts
```

## Files to Modify

- `src/usecases/RefundOverride.ts` — add RecordAuditLog dep + call on success
- `src/usecases/CreateCourse.ts` — same
- `src/usecases/UpdateCourse.ts` — same
- `src/usecases/ArchiveCourse.ts` — same
- `src/composition/container.ts` — wire port + use case
- `src/composition/container.test.ts` — same
- `docs/sprint-plan.md` — split STORY-050 row into 5 rows

## Pitfalls

- **AuditLog writes must never fail the business operation** — if `record()` returns `db_error`, the use case swallows it and logs to `console.error`. A failing audit log must not prevent a refund from being processed.
- **Don't put PII in metadata** — emails, names, etc. should be referenced by id only.
- **`id` is ULID via the injected idGen** — same pattern as Order.id.
- **No test for "the existing tests still pass"** — but if my refactor breaks any of the existing 4 use case test files, those are caught by the `vitest run` gate.
- **RefundOverride's audit entry uses action `refund.overridden`, not `refund.processed`** — the standard ProcessRefund path doesn't get audited in 050a (out of scope, follows later). Only the override path is critical for compliance.
- **`ArchiveCourse` logs `wasAlreadyArchived`** — the admin needs to know if they were a no-op or actually archived something.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
  pnpm vitest run
pnpm build
```

Manual smoke:
- Trigger a refund override via the admin → see a new entry in the in-memory audit log
- Create a course → see entry
- Update a course → see entry
- Archive a course → see entry

## Out of scope (separate stories)

- **STORY-050b** — Simulators (scenario CRUD)
- **STORY-050c** — Live classes (CRUD)
- **STORY-050d** — Discount codes (admin CRUD)
- **STORY-050e** — Badges (admin CRUD) + settings
- **AuditLog admin viewer page** — filter by actor / action / target / date range
- **AuditLog write sites for module / lesson / payment / user actions** — each is a small follow-up
- **ProcessRefund audit log** (the standard path; only the override is logged in 050a)
- **Prisma AuditLog schema + adapter** — the prod container uses in-memory for now
- **Audit log retention policy** — out of scope (the in-memory store grows unbounded)
- **Export audit log to CSV** — out of scope
