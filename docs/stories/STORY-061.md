# STORY-061: Admin audit log viewer + CSV export

**Sprint:** 13
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-050a (AuditLog port + Prisma adapter wired to prod)
**Blocks:** none

## Status

- **Story**: STORY-061
- **Sprint**: 13
- **Points**: 1
- **Status:** ⏳ Planned

## Goal

Ship the admin audit log viewer: a paginated list of all audit log entries, filterable by actor / action / target type + ID / date range, plus a CSV export.

The `IAuditLog` port already has `record()`. This story adds `list()` so the admin panel can read the trail.

After this story:

- `/admin/audit-log` — paginated table with filters
- `/admin/audit-log/export` — CSV download
- `IAuditLog.list()` port method
- `ListAuditLogs` use case
- `ExportAuditLogs` use case

## Why

The audit log is useless if only the code can read it. Admins need to see who did what and when, especially when investigating issues or responding to disputes. The CSV export lets them pull the data into a spreadsheet for further analysis.

## Scope decisions

- **No audit log entry detail page** — the table rows expand in-place to show metadata JSON. A separate detail page is out of scope.
- **No write to audit log in this story** — STORY-050a already wired `RecordAuditLog` everywhere. This story only adds the reader.
- **Metadata stays as JSON** — not broken into columns. The admin viewer shows it as a formatted JSON blob in an expandable row.

## Acceptance Criteria

### Port extension

- [ ] `IAuditLog`: add `list(filters: AuditLogFilters): Promise<Result<AuditLogPage, AuditLogError>>`
  - `AuditLogFilters`: `{ actorId?: string, action?: AuditAction, targetType?: string, targetId?: string, from?: Date, to?: Date, cursor?: string, limit?: number }`
  - `AuditLogPage`: `{ entries: readonly AuditLogEntry[], nextCursor: string | null, total: number }`
  - Sorted by `occurredAt` descending (most recent first)
  - `limit` default: 50, max: 100

### Infra

- [ ] `InMemoryAuditLog.list()` — implement (for test container)
- [ ] `PrismaAuditLog.list()` — implement (for production):
  - Map `AuditLogFilters` to Prisma `where`
  - `targetType` maps to `resource` column
  - `targetId` maps to `resourceId` column
  - `actorId` maps to `userId` column
  - `from`/`to` map to `createdAt` range
  - Use cursor-based pagination via `createdAt` + `id` (standard Prisma cursor pattern)
  - `total` from a separate `count()` query with the same filters
  - `AuditLogEntry` reconstruction: map Prisma row back to domain entity using `createAuditLogEntry()` with `AuditAction` cast (same pattern as `mapRow()` in other Prisma repos — type guard for the action string)

### Use cases (TDD)

- [ ] `ListAuditLogs`: paginated list with filters
  - Input: `{ filters: AuditLogFilters }`
  - Output: `{ entries: readonly AuditLogEntry[], nextCursor: string | null, total: number }`
  - No business logic — just passes filters to the repo and returns the result
- [ ] `ExportAuditLogs`: unbounded export (all matching rows)
  - Input: `{ filters: Omit<AuditLogFilters, "cursor" | "limit"> }`
  - Output: `{ entries: readonly AuditLogEntry[] }` (no pagination, admin responsibility to filter by date range)
  - No limit — uses the repo's internal batch size (100) and fetches all pages internally

### Tests

- [ ] `src/usecases/__tests__/ListAuditLogs.test.ts`
- [ ] `src/usecases/__tests__/ExportAuditLogs.test.ts`
- [ ] `src/infra/repositories/__tests__/InMemoryAuditLog.list.test.ts`
- [ ] `src/infra/repositories/__tests__/PrismaAuditLog.list.test.ts`

### Server actions

- [ ] `listAuditLogsAction` — `{ filters }` → `{ entries, nextCursor, total }`
- [ ] `exportAuditLogsAction` — `{ filters }` → `Response` with `Content-Type: text/csv` (not needed for a route handler — see below)

### Route handler (not a server action)

- [ ] `GET /admin/audit-log/export/route.ts`
  - Reads filters from search params (`actorId`, `action`, `targetType`, `targetId`, `from`, `to`)
  - Calls `ExportAuditLogs` use case
  - Streams CSV rows directly (no in-memory array for large exports — iterate pages and write to a Transform stream)
  - Headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="audit-log-<date>.csv"`
  - CSV columns: `occurredAt, actorId, action, targetType, targetId, metadata`

### Pages

- [ ] `/admin/audit-log/page.tsx`:
  - Server component — calls `listAuditLogsAction` via `useActionState` or direct server action
  - Table columns: `occurredAt` (formatted), `actor` (user email lookup via userId), `action`, `target type`, `target ID`, expandable `metadata` preview
  - Filters: actor email search, action dropdown, target type, date range picker (from/to)
  - Pagination: cursor-based, "Load more" button or "Previous / Next" links
  - Export button → links to `/admin/audit-log/export?...` with current filters in query string
  - Read-only — no mutations on this page

### Container

- [ ] `AppContainer`: add `listAuditLogs`, `exportAuditLogs` (these use the same `auditLog` port already in the container)
- [ ] `TestContainer`: same

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — existing tests + new tests passing
- [ ] `pnpm build` succeeds

## Files to Create

```
src/usecases/ListAuditLogs.ts
src/usecases/ExportAuditLogs.ts
src/usecases/__tests__/ListAuditLogs.test.ts
src/usecases/__tests__/ExportAuditLogs.test.ts
src/infra/repositories/__tests__/InMemoryAuditLog.list.test.ts
src/infra/repositories/__tests__/PrismaAuditLog.list.test.ts
src/app/actions/listAuditLogs.action.ts
src/app/admin/audit-log/page.tsx
src/app/admin/audit-log/page.module.css
src/app/admin/audit-log/export/route.ts
```

## Files to Modify

- `src/ports/repositories/IAuditLog.ts` — add `list()` method + `AuditLogFilters` + `AuditLogPage` types
- `src/infra/repositories/InMemoryAuditLog.ts` — implement `list()`
- `src/infra/repositories/PrismaAuditLog.ts` — implement `list()`
- `src/composition/container.ts` — wire `listAuditLogs` + `exportAuditLogs`
- `src/composition/container.test.ts` — same

## Pitfalls

- **CSV streaming** — don't collect all rows in memory then write. Use a `Readable` stream + `TextEncoder` to stream rows directly to the response. Large exports could OOM otherwise.
- **`AuditAction` type guard** — the Prisma row's `action` column is a `String`, not a `AuditAction`. Cast it and let the consumer handle an invalid persisted value (same pattern as `PaymentStatus.isValid()` on the order repo).
- **No `AuditLogEntry` hydration factory** — unlike other entities, `AuditLogEntry` has no `hydrate()` factory. Reconstruct from the row using `createAuditLogEntry()` directly.
- **Actor email requires a join** — `AuditLogEntry.actorId` is just a user ID string. The page needs the user's email. Call `userRepo.findById()` per distinct actor in the page (or batch-fetch in the action to avoid N+1).
- **Audit log grows unbounded** — no retention policy in this story. Document it as a follow-up concern.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
  pnpm vitest run
pnpm build
```

Manual smoke:

- Sign in as admin
- Visit `/admin/audit-log` — see the list (or empty state)
- Apply filters — see filtered results
- Click export — download CSV with matching rows
- Click a row — expand to see metadata JSON

## Out of scope

- **Audit log entry detail page** — metadata shown inline in expandable row
- **Audit log retention / archival** — unbounded grow
- **Write sites for new actions** — STORY-050a already wired them; new actions get their write sites in their own stories
- **Real-time audit log** — polling or WebSocket updates
