# STORY-062: Admin refund requests list + process

**Sprint:** 13
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-049 (RefundOverride use case exists), STORY-046 (admin layout + requireAdmin)
**Blocks:** none

## Status

- **Story**: STORY-062
- **Sprint**: 13
- **Points**: 1
- **Status:** ⏳ Planned

## Goal

Ship the admin refund surface: a list of orders with pending refund requests, and the ability to approve (process) or reject those requests from a dedicated page.

After this story:

- `/admin/refunds` — paginated list of orders with refund requests (requested or processed)
- `/admin/refunds/[orderId]` — order detail + refund request info + refund form
- `ListRefundRequests` use case
- `AdminProcessRefund` use case (wraps existing `RefundOverride`)
- Server actions: `listRefundRequests`, `processRefund`

## Why

Students request refunds via `RequestRefund` (STORY-025) and those requests land in `orders.refundRequestedAt`. The admin needs to see these requests and process them. The existing `/admin/payments/[id]` page handles individual order detail, but there's no dedicated refund view that surfaces only orders with requests and makes the refund workflow front-and-center.

## Scope decisions

- **Refund rejection** — the student-facing `RequestRefund` only creates the request. This story does not include a "reject refund request" action. If the admin decides not to refund, they just leave the order as PAID and optionally send a manual email. "Reject" is a follow-up story.
- **Partial refunds** — not supported in this story. The form always refunds the full `order.totalMinor`.
- **New refund request notifications** — not in scope. An email on refund approval (STORY-049.8) is a follow-up.
- **Dedicated refunds nav item** — add "Refunds" to the admin sidebar alongside "Payments".

## Domain model

Refunds are stored on the `Order` entity, not a separate table:

- `order.refundRequestedAt` — non-null means a refund was requested
- `order.refundReason` — student's reason
- `order.refundProcessedAt` — non-null means admin has processed it
- `order.refundAmountMinor` — amount refunded (can be partial in a future story)
- `order.status === "REFUNDED"` — final state

## Acceptance Criteria

### Port extensions

- [ ] `IOrderRepository`: add `listRefundRequests(filters)` method
  - `RefundRequestFilters`: `{ status?: "pending" | "processed", userEmailSearch?: string, cursor?: string, limit?: number }`
  - `"pending"` = `refundRequestedAt IS NOT NULL AND refundProcessedAt IS NULL`
  - `"processed"` = `refundProcessedAt IS NOT NULL`
  - Returns: `{ orders: readonly OrderWithUser[], nextCursor: string | null, total: number }`
  - Sorted by `refundRequestedAt` desc

### Infra

- [ ] `InMemoryOrderRepository.listRefundRequests()` — implement (for test container)
- [ ] `PrismaOrderRepository.listRefundRequests()` — implement:
  - Build Prisma `where` from filters
  - Join to `User` for email
  - Cursor-based pagination via `refundRequestedAt` + `id`
  - `total` from separate `count()` query

### Use cases (TDD)

- [ ] `ListRefundRequests`: paginated refund request list
  - Input: `{ filters: RefundRequestFilters }`
  - Output: `{ orders: readonly OrderWithUser[], nextCursor: string | null, total: number }`
  - Business logic: none — pure pass-through to the repo

- [ ] `AdminProcessRefund`: process a pending refund request
  - Input: `{ orderId: string, actorId: string }`
  - Steps:
    1. Find order — `order_not_found`
    2. Must have `refundRequestedAt` set — `no_refund_requested`
    3. Must not have `refundProcessedAt` set — `already_processed`
    4. Must be PAID — `not_paid`
    5. Call `RefundOverride.execute({ orderId, actorId, amountMinor: order.totalMinor, reason: order.refundReason ?? "Refund", overrideReason: "Admin processed student refund request" })`
    6. Return `{ order: updatedOrder }`
  - Note: reuses `RefundOverride` internally. `RefundOverride` handles the PayMongo gateway call and order state transition.

### Tests

- [ ] `src/usecases/__tests__/ListRefundRequests.test.ts`
- [ ] `src/usecases/__tests__/AdminProcessRefund.test.ts`
- [ ] `src/infra/repositories/__tests__/InMemoryOrderRepository.listRefundRequests.test.ts`
- [ ] `src/infra/repositories/__tests__/PrismaOrderRepository.listRefundRequests.test.ts`

### Server actions

- [ ] `listRefundRequestsAction` — `{ filters }` → `{ orders, nextCursor, total }`
- [ ] `processRefundAction` — `{ orderId }` (actorId from session) → `{ order }`
- [ ] `getRefundOrderAction` — `{ orderId }` → `{ order: OrderWithUserAndCourse }` (reuse `AdminGetPayment` for the detail)

### Pages

- [ ] `/admin/refunds/page.tsx`:
  - Heading: "Refund Requests"
  - Tab toggle: "Pending" | "Processed"
  - Table columns: `Requested`, `Student`, `Course`, `Amount`, `Reason` (truncated), `Status` badge
  - Row click → `/admin/refunds/[orderId]`
  - Pagination: cursor-based
  - Empty state: "No refund requests" per tab

- [ ] `/admin/refunds/[orderId]/page.tsx`:
  - Section 1: Student info (email, name, enrolled course)
  - Section 2: Order summary (amount paid, dates, PayMongo reference)
  - Section 3: Refund request (reason, requested at)
  - Section 4: Refund status badge ("Pending" or "Processed" + processed at)
  - Section 5: "Process Refund" form (only shown for pending requests)
    - Pre-filled reason from student's request
    - Full amount shown (non-editable in this story)
    - Confirm button → calls `processRefundAction`
    - On success: show success message, status badge updates to "Processed"
  - "View full order" link → `/admin/payments/[orderId]`

### Navigation

- [ ] Add "Refunds" nav item to admin sidebar (alongside "Payments")
  - Badge showing pending count (fetched on sidebar load)

### Container

- [ ] `AppContainer`: add `listRefundRequests`, `adminProcessRefund`
- [ ] `TestContainer`: same

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — existing tests + new tests passing
- [ ] `pnpm build` succeeds

## Files to Create

```
src/usecases/ListRefundRequests.ts
src/usecases/AdminProcessRefund.ts
src/usecases/__tests__/ListRefundRequests.test.ts
src/usecases/__tests__/AdminProcessRefund.test.ts
src/infra/repositories/__tests__/InMemoryOrderRepository.listRefundRequests.test.ts
src/infra/repositories/__tests__/PrismaOrderRepository.listRefundRequests.test.ts
src/app/actions/listRefundRequests.action.ts
src/app/actions/processRefund.action.ts  (or rename/refactor existing processRefundAction if named differently)
src/app/admin/refunds/page.tsx
src/app/admin/refunds/page.module.css
src/app/admin/refunds/[orderId]/page.tsx
src/app/admin/refunds/[orderId]/page.module.css
```

## Files to Modify

- `src/ports/repositories/OrderRepository.ts` — add `listRefundRequests()` to interface
- `src/infra/repositories/InMemoryOrderRepository.ts` — implement `listRefundRequests()`
- `src/infra/repositories/PrismaOrderRepository.ts` — implement `listRefundRequests()`
- `src/composition/container.ts` — wire `listRefundRequests` + `adminProcessRefund`
- `src/composition/container.test.ts` — same
- `src/components/admin/NavSidebar.tsx` — add Refunds nav item

## Pitfalls

- **Reuse `RefundOverride`, don't duplicate its logic** — `AdminProcessRefund` should be a thin orchestrator that calls `RefundOverride.execute()` internally. Don't copy-paste the PayMongo refund call.
- **`refundRequestedAt` is nullable** — the "no refund requested" check is `refundRequestedAt === null`, not checking a status field.
- **Partial refunds not in scope** — hardcode `amountMinor: order.totalMinor` in `AdminProcessRefund`. Don't try to make the form editable yet.
- **Refund reason may be null** — `order.refundReason` is optional in the schema. Show "No reason provided" in the UI if null.
- **Audit log already wired** — `RefundOverride` calls `recordAuditLog` internally. No extra audit work needed here.

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
- Visit `/admin/refunds` — see "Pending" tab with pending requests (or empty state)
- Click a pending request → see student info + refund reason
- Click "Process Refund" → order goes to "Processed" tab
- Visit `/admin/payments/[orderId]` → see refund history

## Out of scope

- **Partial refunds** — only full refunds in this story
- **Refund rejection** — student just waits; admin sends manual email
- **Refund request notifications** — email on request, email on process
- **Refund count badge on sidebar** — sidebar badge is out of scope; add it in a follow-up
