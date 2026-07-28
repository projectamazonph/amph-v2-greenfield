# Business Layer — Project Amazon PH Academy v2

**Status:** Approved
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield)
**Last updated:** 2026-07-28 (doc audit — Payment/Receipt/Refund -> Order model, refund window, receipt status)

---

## Purpose

The business layer is what turns Project Amazon PH Academy from "free course site" into "paid product business." It covers pricing tiers, the enrollment flow, payment processing via PayMongo, refunds, and tier-based content gating.

**Note on entities:** There is no separate `Payment` or `Refund` table. The `Order` entity (`src/domain/entities/Order.ts`) is the single source of truth for all payment-related state. `Order.status` tracks the payment lifecycle (pending/completed/failed/expired/refunded), and `Order.paymongoStatus` mirrors PayMongo's raw status. Receipt PDF generation and Vercel Blob upload are not yet implemented (Sprint 13 placeholder). The `BusinessProfile` table for BIR compliance is also not yet implemented.

This spec assumes PayMongo as the payment provider, behind the `IPaymentGateway` port. PayMongo is the right choice because:

- Native Philippine peso (PHP) support, no currency conversion fees
- Supports GCash, Maya, GrabPay, bank transfer (InstaPay/PESONet), and credit/debit card
- Cleaner API than alternatives; better developer experience for one-time Philippine peso flows
- Reliable webhook delivery with signature verification
- Test mode well-documented (`sk_test_*` / `pk_test_*` keys)

If we ever need a second provider (e.g. Stripe for international expansion), it is a new adapter in `src/infra/<provider>/` implementing `IPaymentGateway`. No use case or app code changes. OCP, ADR-013.

## Pricing Tiers

Three tiers, matching ProjectAmazonPH's existing structure:

| Tier                        | Price (minor) | Price (display) | Includes                                                                                                                                                                  |
| --------------------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PPC Foundations**         | 299900        | ₱2,999          | 5 core modules, basic tools (Campaign Builder, Bid Elevator, STR Triage), quizzes, badges, community access                                                               |
| **Accelerated Mastery**     | 599900        | ₱5,999          | Everything in Foundations + advanced modules (8 total), all scenario packs (kitchen, electronics, garden, fitness, beauty), downloadable resources, live class recordings |
| **Ultimate Transformation** | 999900        | ₱9,999          | Everything in Mastery + weekly live classes with Ryan, 1-on-1 portfolio review (1×/month), private community channel, certificate priority review                         |

Prices are stored on `Course.priceMinor` (integer centavos). Tier is a `CourseAccessTier` value object. Editing tier price is admin-only (see admin backend spec).

**Bundle option:** All-access pass = ₱12,999 (saves ₱6,997 vs buying Ultimate once + future updates). Admin-controlled. Sold only when admin sets `isActive = true`.

**Early bird:** First 30 enrollments across all tiers pay ₱499. Implemented as a `PricingService` rule, not a discount code. Once the 30th enrollment completes, the early-bird price is gone forever. The rule lives in `src/infra/pricing/EarlyBirdPricingService.ts`, with tests.

**Discount codes:** Single-use and multi-use. Created by admin. Applied at checkout. Stored in `DiscountCode` table.

## Enrollment Flow

```
1. Visitor browses /pricing
2. Picks tier -> POST /api/checkout (creates PayMongo Checkout Session via IPaymentGateway port)
3. Redirected to PayMongo-hosted payment page
4. Pays via GCash / Maya / card / bank
5. PayMongo webhook POST /api/webhooks/paymongo -> server verifies signature
6. HandlePaymentWebhook use case:
   a. Verifies signature (PayMongoGateway)
   b. Loads course (CourseRepository)
   c. Checks idempotency via PrismaWebhookEventLog (prevents duplicate event processing)
   d. In a single DB transaction:
      - Create or update Order row (status = COMPLETED)
      - Create Enrollment row
      - Send confirmation email (EmailSender)
      - Award first-touch XP (XPService) + "New enrollment" badge
   e. Returns Result.ok
7. User clicks email link -> already logged in or sent to signup -> lands in dashboard
```

### State Machine

```
   start
     │
     ▼
   [pending]  ----- expires (30 min) -----> [expired]
     │                                        │
     │ payment.paid                           │
     ▼                                        │
  [completed]  (Order COMPLETED +                 │
     │          Enrollment + Email sent)        │
     │                                        │
     ├---- refund.created ----> [refunded]  (Enrollment.revoked = true)
     │
     └---- admin.revoke -----> [revoked]   (admin action, audit logged)
```

Each state is a column on `Order.status` and `Enrollment.status`. Discriminated unions in the domain, string enums in the database. `WebhookEvent` (stored in `PrismaWebhookEventLog`) tracks processed event IDs for idempotency.

### Idempotency

- `Order.paymongoReference` is server-generated, stored on the row, sent to PayMongo as the `reference` field.
- Replays of the same `payment.paid` webhook with the same PayMongo event ID are no-ops (the `HandlePaymentWebhook` use case checks `PrismaWebhookEventLog.processedAt` before doing anything).
- Replays of the same `payment.paid` with a different event ID but the same `reference` (extremely rare) trigger a `WebhookError.AmbiguousEvent` to Sentry. Operator investigates.

## Refund Flow

### Within Window (default 30 days)

```
1. User clicks "Request refund" on /order/[orderId]
2. POST /api/refunds (or refundAction server action)
3. RequestRefund use case:
   a. Loads order (IOrderRepository)
   b. Checks window: now - order.createdAt <= 30 days (REFUND_WINDOW_DAYS from OrderRefund value object)
   c. Calls PaymentGateway.refund(order)
   d. In a single DB transaction:
      - Update Order.status = "refunded"
      - Update Enrollment.revoked = true, revokedAt, revokedReason
      - Send refund email (EmailSender)
   e. Returns Result.ok
```

### Outside Window (Admin Override)

```
1. Admin opens /admin/refunds/[orderId]
2. Clicks "Issue refund (override)"
3. Enters reason (20+ chars, validated)
4. ProcessRefund use case:
   a. Same as above, but no window check
   b. AuditLog entry: actor=adminId, target=orderId, event="refund.override", metadata={reason}
   c. Email includes "Issued by support" line
```

## Receipts

> **Status: Not yet implemented.** Receipt PDF generation and Vercel Blob upload are planned for Sprint 13. The `ReactPdfCertificateRenderer` adapter exists for certificates; it can be reused for receipts once this story is picked up.

Until then, confirmation emails serve as the primary proof of purchase. BIR-compliant receipt PDFs (with business name, TIN, address from `BusinessProfile`, customer info, line items, VAT breakdown) are a planned feature. The `BusinessProfile` table does not yet exist; it is tracked as a future admin-managed entity.

## Tier-Based Content Gating

Implemented by the `IAccessPolicy` port (`src/ports/access/AccessPolicy.ts`).

```ts
export type AccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "not_enrolled" | "tier_insufficient" | "enrollment_revoked" | "course_not_found";
    };

export interface IAccessPolicy {
  canAccessCourse(user: UserSnapshot, course: Course): Promise<AccessDecision>;
  canUseSimulator(user: UserSnapshot, sim: Simulator<unknown, unknown>): Promise<AccessDecision>;
  canRequestRefund(user: UserSnapshot, order: Order): Promise<AccessDecision>;
  canIssueCertificate(user: UserSnapshot, course: Course): Promise<AccessDecision>;
}
```

| Resource                | Foundations   | Mastery       | Ultimate      | Admin                                  |
| ----------------------- | ------------- | ------------- | ------------- | -------------------------------------- |
| Foundations course      | yes           | yes           | yes           | yes                                    |
| Mastery course          | no            | yes           | yes           | yes                                    |
| Ultimate course         | no            | no            | yes           | yes                                    |
| All-access pass holders | yes           | yes           | yes           | yes                                    |
| Campaign Builder        | yes           | yes           | yes           | yes                                    |
| Bid Elevator            | yes           | yes           | yes           | yes                                    |
| STR Triage              | yes           | yes           | yes           | yes                                    |
| Listing Audit           | no            | yes           | yes           | yes                                    |
| Keyword Research        | no            | yes           | yes           | yes                                    |
| Live classes (RSVP)     | no            | no            | yes           | yes                                    |
| Recordings archive      | no            | no            | yes           | yes                                    |
| Certificate download    | on completion | on completion | on completion | n/a                                    |
| `/admin/*`              | no            | no            | no            | yes (super_admin only for impersonate) |

The `IAccessPolicy` implementation is a single class that reads from the registry and the user's enrollments. It is the only place these rules are encoded. UI and server actions both ask it, so the rule lives in one place. ISP, DIP.

## Discount Codes

| Attribute                  | Description                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| `code`                     | Unique, 4-32 chars, uppercase alphanumeric                                       |
| `type`                     | `percent` or `fixed`                                                             |
| `value`                    | For percent: 1-100. For fixed: integer minor units.                              |
| `validCourseIds`           | Empty = valid for all courses. Otherwise: explicit list.                         |
| `validFrom` / `validUntil` | Optional window. Null = no bound.                                                |
| `maxUses`                  | Null = unlimited. Integer = max total uses.                                      |
| `currentUses`              | Denormalized counter, incremented by `ApplyDiscountCode`.                        |
| `singleUsePerUser`         | If true, a user can use the code once. Otherwise, subject to `maxUses`.          |
| `stacksWithEarlyBird`      | If false, applying a discount code disables the early-bird price. Default false. |

Discount codes are applied in the `CreatePaymentIntent` use case, after pricing is quoted but before the PayMongo call. The code, the original price, the discount, and the final price are stored on `Order` for audit. `Order.amount` is the final charged amount (not the list price).

Use tracking: `DiscountCode.currentUses` is a denormalized counter incremented by `ApplyDiscountCode`. There is no separate `DiscountCodeUse` table - single-use enforcement uses `DiscountCode.singleUsePerUser` checked against the user's existing order history.

## State Machines

### Order / Payment

```
   [pending]  ----- payment.paid -----> [completed]  ----- refund.created -----> [refunded]
     │                              │                                   │
     ├- payment.failed ----> [failed]  ├- admin.fraud ----> [flagged]        ├- (terminal)
     │
     └- checkout.expired ----> [expired]  (terminal)
```

Single `Order` entity. No separate `Payment` or `Refund` table. Refund state lives on `Order.status`.

### Enrollment

```
   [active]  ---- refund ----> [revoked]
     │                       │
     ├- admin.revoke ----> [revoked]
     │
     └- (terminal: revoked enrollments are kept for audit but filtered from access checks)
```

## What Lives Where

| Concern                 | Domain                             | Port                      | Use case                                                    | Adapter                        |
| ----------------------- | ---------------------------------- | ------------------------- | ----------------------------------------------------------- | ------------------------------ |
| `Money` arithmetic      | `src/domain/values/Money.ts`       | -                         | -                                                           | -                              |
| `Order` entity          | `src/domain/entities/Order.ts`     | -                         | -                                                           | -                              |
| Refund policy (window)  | `src/domain/values/OrderRefund.ts` | -                         | `RequestRefund`                                             | -                              |
| Tier <-> Course mapping | `src/domain/entities/Course.ts`    | -                         | -                                                           | -                              |
| PayMongo call           | -                                  | `IPaymentGateway`         | `CreatePaymentIntent`                                       | `PayMongoAdapter`              |
| Webhook handling        | -                                  | `IPaymentGateway`         | `HandlePaymentWebhook`                                      | `PayMongoAdapter`              |
| Discount code lookup    | -                                  | `IDiscountCodeRepository` | `CreatePaymentIntent`, `ApplyDiscountCode`                  | `PrismaDiscountCodeRepository` |
| Refund call             | -                                  | `IPaymentGateway`         | `RequestRefund`                                             | `PayMongoAdapter`              |
| Tier-gating decisions   | -                                  | `IAccessPolicy`           | every use case                                              | `TierAccessPolicy`             |
| PDF rendering           | -                                  | `IPdfRenderer`            | `IssueCertificate` (receipt: not yet built)                 | `ReactPdfCertificateRenderer`  |
| Email send              | -                                  | `IEmailSender`            | `HandlePaymentWebhook`, `RequestRefund`, `IssueCertificate` | `ResendEmailSender`            |

The business rules are in `domain/`. The orchestration is in `usecases/`. The outside world is in `infra/`. The wire-up is in `composition/`. Pages and actions are thin.
