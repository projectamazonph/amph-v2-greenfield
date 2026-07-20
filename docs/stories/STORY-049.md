# STORY-049: Admin payments + refunds + refund override

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-046, STORY-047 (admin layout + requireAdmin)
**Blocks:** none

## Status

- **Story**: STORY-049
- **Sprint**: 10 — Admin panel
- **Points**: 1
**Status:** ✅ Done (PR #049, commit `4235d5d` — `feat(admin): STORY-049 admin payments + refunds + refund override`)

## Goal

Ship the admin payments surface: list all payments (orders), see payment detail, and process refunds (including the override path for refunds outside the standard window or where the student already requested a refund).

After this story:

- `/admin/payments` — list of all orders with status filter (PAID / PENDING / REFUNDED / FAILED / EXPIRED / DRAFT) and search by user email
- `/admin/payments/[id]` — order detail with full timeline, refund form
- `AdminListPayments` use case
- `AdminGetPayment` use case
- `ProcessRefund` use case — issues a refund via the payment gateway + marks order REFUNDED
- `RefundOverride` use case — same as ProcessRefund but bypasses the 30-day window and the "already_requested" guard
- `IPaymentGateway.refund()` port method + `InMemoryPaymentGateway` stub

## Why

The current admin panel handles users + courses + modules + lessons. The next missing piece is **payments** — the admin needs to see who's paid for what, when, and issue refunds. Refund processing is the critical operation; we need both the standard path and the override path so support agents can handle disputes, goodwill refunds, and Stripe/PayMongo "uncaptured" scenarios.

## Scope decision: refund gateway is a stub

`IPaymentGateway.refund()` is added to the port. The prod `PayMongoAdapter` gets a stub implementation that throws "not yet wired" (the real PayMongo Refunds API is a separate story). The `InMemoryPaymentGateway` gets a working stub that records the refund. The use cases test against the in-memory stub.

This keeps 049 within the 1-pt budget. The follow-up (`STORY-049.5: PayMongo Refunds API`) wires the real adapter.

## Acceptance Criteria

### Domain (no changes)

`Order` already has `markRefunded(reason, amountMinor)`. No domain changes needed.

### Port extensions

- [ ] `IOrderRepository`: add `listAll(filters)` method
  - Filters: `status?: PaymentStatus`, `userEmailSearch?: string`
  - Returns: `readonly Order[]` sorted by `createdAt` desc
  - For 049, the email search is a simple client-side join (the repo doesn't know about users); the use case does the join. The repo just returns orders.
- [ ] `IPaymentGateway`: add `refund(params)` method
  - Input: `{ paymongoPaymentId: string, amountMinor: number, reason: string }`
  - Output: `Result<{ refundId: string, processedAt: Date }, PaymentGatewayError>`

### Infra

- [ ] `InMemoryPaymentGateway` (or whichever the test stub is named) — implement `refund` to record the call + return a fake refundId
- [ ] `PayMongoAdapter.refund()` — stub: throws "not yet wired"
- [ ] `InMemoryOrderRepository` — implement `listAll`
- [ ] `PrismaOrderRepository` — implement `listAll` (typed Prisma rows)

### Use cases (all TDD)

- [ ] `AdminListPayments`: list orders with status filter + user email search
  - Input: `{ status?: PaymentStatus, userEmailSearch?: string }`
  - Output: `{ orders: readonly OrderWithUser[] }`
- [ ] `AdminGetPayment`: get one order with user + course data
  - Input: `{ orderId: string }`
  - Output: `{ order: Order, user: User, course: Course }`
- [ ] `ProcessRefund`: issue refund via gateway + mark order REFUNDED
  - Input: `{ orderId: string, amountMinor: number, reason: string }`
  - Validates: order is PAID, within 30-day window, no existing refund request
  - Calls gateway.refund(); on success: `order.markRefunded(reason, amountMinor)` + persist
- [ ] `RefundOverride`: same as ProcessRefund but bypasses the window + "already requested" checks
  - Input: `{ orderId: string, amountMinor: number, reason: string, overrideReason: string }`
  - The `overrideReason` is mandatory and stored on the order for audit
  - Note: does NOT bypass the "order must be PAID" check (you can't refund a non-paid order)

### Tests

- [ ] `src/usecases/__tests__/AdminListPayments.test.ts`
- [ ] `src/usecases/__tests__/AdminGetPayment.test.ts`
- [ ] `src/usecases/__tests__/ProcessRefund.test.ts`
- [ ] `src/usecases/__tests__/RefundOverride.test.ts`
- [ ] Tier B #2 closure: tests for `InMemoryOrderRepository.listAll` + `InMemoryPaymentGateway.refund`

### Server actions

- [ ] `processRefundAction` — admin issues a refund (with optional override)
- [ ] (List + detail pages are read-only; no actions needed)

### Pages

- [ ] `/admin/payments` — list with status filter + email search
- [ ] `/admin/payments/[id]` — order detail with:
  - Order summary (id, status, amount, currency, created, paid, refunded dates)
  - User info (email, name)
  - Course info (title, slug)
  - PayMongo info (payment id, status, checkout URL)
  - "Process refund" form (with override toggle that asks for override reason)
  - Refund history (if any)

### Container

- [ ] Wire 4 new use cases into `AppContainer` + `TestContainer`

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 1191 + new tests passing
- [ ] `pnpm build` succeeds

## Files to Create

```
src/usecases/AdminListPayments.ts
src/usecases/AdminGetPayment.ts
src/usecases/ProcessRefund.ts
src/usecases/RefundOverride.ts

src/usecases/__tests__/AdminListPayments.test.ts
src/usecases/__tests__/AdminGetPayment.test.ts
src/usecases/__tests__/ProcessRefund.test.ts
src/usecases/__tests__/RefundOverride.test.ts

src/infra/payment/__tests__/InMemoryPaymentGateway.refund.test.ts (Tier B #2)
src/infra/payment/__tests__/InMemoryOrderRepository.listAll.test.ts (Tier B #2)

src/app/actions/processRefund.action.ts

src/app/admin/payments/page.tsx
src/app/admin/payments/page.module.css
src/app/admin/payments/[id]/page.tsx
src/app/admin/payments/[id]/page.module.css
```

## Files to Modify

- `src/ports/repositories/OrderRepository.ts` — add `listAll` to interface
- `src/ports/payment/IPaymentGateway.ts` — add `refund` method
- `src/infra/payment/InMemoryPaymentGateway.ts` (or wherever) — implement `refund`
- `src/infra/payment/PayMongoAdapter.ts` — stub `refund`
- `src/infra/repositories/InMemoryOrderRepository.ts` — implement `listAll`
- `src/infra/repositories/PrismaOrderRepository.ts` — implement `listAll`
- `src/composition/container.ts` — wire 4 new use cases
- `src/composition/container.test.ts` — same

## Pitfalls

- **`Order.markRefunded` is mutating** — the use case must call it via the entity, not bypass the state machine.
- **Refund amount validation** — the use case must verify `amountMinor <= order.totalMinor`. Refunding more than the original is a misuse.
- **Override reason is mandatory** — never auto-bypass without an explicit reason; it goes to the audit log.
- **`RefundOverride` does NOT bypass the "order must be PAID" check** — only the window + already-requested checks. The order must still be PAID.
- **Refund order is "PAID → REFUNDED"** — can't refund a DRAFT, PENDING, FAILED, EXPIRED, or already-REFUNDED order. The use case validates this.
- **No AuditLog port yet** — the override reason is stored on the order, but not separately logged. TODO comment in the use case.
- **Email search is client-side for now** — the repo doesn't have a `where user.email like ...` join. The use case fetches all matching orders then filters by user email in memory. For prod scale, this should move to Prisma with a join; document as a follow-up.
- **PayMongoAdapter.refund is a stub** — throws "not yet wired". Use cases test against the in-memory stub. The prod container will need this wired before the admin can actually issue real refunds.

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
- Visit `/admin/payments` — see all orders (or empty)
- Click an order — see detail
- Click "Process refund" on a PAID order within the window — order becomes REFUNDED
- Try to process refund on a PENDING order — see error
- Try to process refund on a REFUNDED order — see error
- Click "Override" and provide an override reason — order becomes REFUNDED even outside the window

## Out of scope (separate stories)

- **STORY-049.5** — PayMongo Refunds API real adapter
- **STORY-049.6** — Partial refunds (multiple refunds per order) — not supported in this story, only full refund
- **STORY-049.7** — Refund webhook handler (PayMongo sends a `refund.succeeded` event)
- **STORY-049.8** — Refund email notification to the student
- **STORY-049.9** — Server-side email search (Prisma join)
- **AuditLog** for refund actions
- **Pagination** on `/admin/payments` — for now it returns all orders; the page will need pagination as the dataset grows (use `usePagination` from a future story)
- **Order timeline view** — for now the detail page is a flat list of fields; a timeline visualization is a follow-up
