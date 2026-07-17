# STORY-025 — RequestRefund Use Case + `/api/refunds`

## Status

- **Story**: STORY-025
- **Sprint**: 5 — Enrollment + Access Policy
- **Points**: 1
- **Status**: Pending

## Overview

Students request a refund on a paid order. The refund window is **30 days** from the original payment date. Admin processing is out of scope ( STORY-031 in Sprint 7).

## Domain Model

### `Order.markRefunded` (existing, already implemented)

The `Order` entity already has `markRefunded(reason: string, amountMinor: number)` which transitions `PAID → REFUNDED`.

### Refund Window

```typescript
const REFUND_WINDOW_DAYS = 30;
```

```typescript
/**
 * Is this order within the refund window?
 * Refund window: paidAt + 30 days.
 */
function isWithinRefundWindow(order: Order, now: Date): boolean;
```

## `RequestRefund` Use Case

```typescript
interface RequestRefundInput {
  orderId: string;
  userId: string;    // must match order.userId
  reason: string;    // non-empty reason
}

interface RequestRefundDeps {
  orderRepo: IOrderRepository;
  clock: Clock;
}

type RequestRefundError =
  | { kind: "order_not_found" }
  | { kind: "not_your_order" }
  | { kind: "not_paid" }
  | { kind: "outside_refund_window" }
  | { kind: "already_requested" };

type RequestRefundResult = Result<{ order: Order }, RequestRefundError>;
```

Rules:
1. Order must exist → `order_not_found`
2. Order must belong to userId → `not_your_order`
3. Order must be PAID → `not_paid`
4. Must be within 30-day refund window → `outside_refund_window`
5. Must not have already been requested → `already_requested`
6. Set `order.refundRequestedAt = now`, `order.refundReason = reason`
7. Status stays PAID (admin processes later)

## API Endpoint

```
POST /api/refunds
```

Request body:
```json
{
  "orderId": "ord_...",
  "reason": "Course didn't meet my expectations"
}
```

Response (200 OK):
```json
{
  "ok": true,
  "orderId": "ord_...",
  "message": "Refund request submitted. We'll review it within 2 business days."
}
```

Error responses:
- `400 { ok: false, error: "reason_required" }` — empty reason
- `401` — not authenticated
- `404 { ok: false, error: "order_not_found" }` — order not found
- `403 { ok: false, error: "not_your_order" }` — wrong user
- `409 { ok: false, error: "not_paid" }` — order not paid
- `409 { ok: false, error: "outside_refund_window" }` — past 30 days
- `409 { ok: false, error: "already_requested" }` — refund already requested

## Architecture

```
domain/values/OrderRefund.ts   # isWithinRefundWindow() + REFUND_WINDOW_DAYS

usecases/
  RequestRefund.ts             # RequestRefund use case
```

Note: No new port needed — uses existing `IOrderRepository.update()`.

## Tests

### Domain

- `isWithinRefundWindow`: order paid today → true
- `isWithinRefundWindow`: order paid 29 days ago → true
- `isWithinRefundWindow`: order paid 30 days ago → false
- `isWithinRefundWindow`: order paid 31 days ago → false
- `isWithinRefundWindow`: order has no paymongoPaidAt → false

### `RequestRefund` use case

- Valid request → sets refundRequestedAt + refundReason, returns PAID order
- Order not found → `order_not_found`
- Order belongs to different user → `not_your_order`
- Order not PAID (DRAFT) → `not_paid`
- Order not PAID (REFUNDED) → `not_paid`
- Order within 30 days → succeeds
- Order at exactly 30 days → `outside_refund_window`
- Order at 31 days → `outside_refund_window`
- Refund already requested → `already_requested`
