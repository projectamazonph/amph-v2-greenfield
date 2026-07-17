# Business Layer — Project Amazon PH Academy v2

**Status:** Approved
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield)

---

## Purpose

The business layer is what turns Project Amazon PH Academy from "free course site" into "paid product business." It covers pricing tiers, the enrollment flow, payment processing via PayMongo, refunds, receipts, and tier-based content gating.

This spec assumes PayMongo as the payment provider, behind the `PaymentGateway` port. The contract is documented in `src/ports/gateways/PaymentGateway.ts`. PayMongo is the right choice because:
- Native Philippine peso (PHP) support, no currency conversion fees
- Supports GCash, Maya, GrabPay, bank transfer (InstaPay/PESONet), and credit/debit card
- Cleaner API than alternatives; better developer experience for one-time Philippine peso flows
- Reliable webhook delivery with signature verification
- Test mode well-documented (`sk_test_*` / `pk_test_*` keys)

If we ever need a second provider (e.g. Stripe for international expansion), it is a new adapter in `src/infra/<provider>/` implementing `PaymentGateway`. No use case or app code changes. OCP, ADR-013.

## Pricing Tiers

Three tiers, matching ProjectAmazonPH's existing structure:

| Tier | Price (minor) | Price (display) | Includes |
|------|--------------|-----------------|----------|
| **PPC Foundations** | 299900 | ₱2,999 | 5 core modules, basic tools (Campaign Builder, Bid Elevator, STR Triage), quizzes, badges, community access |
| **Accelerated Mastery** | 599900 | ₱5,999 | Everything in Foundations + advanced modules (8 total), all scenario packs (kitchen, electronics, garden, fitness, beauty), downloadable resources, live class recordings |
| **Ultimate Transformation** | 999900 | ₱9,999 | Everything in Mastery + weekly live classes with Ryan, 1-on-1 portfolio review (1×/month), private community channel, certificate priority review |

Prices are stored on `Course.priceMinor` (integer centavos). Tier is a `CourseTier` enum value. Editing tier price is admin-only (see admin backend spec).

**Bundle option:** All-access pass = ₱12,999 (saves ₱6,997 vs buying Ultimate once + future updates). Admin-controlled. Sold only when admin sets `isActive = true`.

**Early bird:** First 30 enrollments across all tiers pay ₱499. Implemented as a `PricingService` rule, not a discount code. Once the 30th enrollment completes, the early-bird price is gone forever. The rule lives in `src/infra/pricing/EarlyBirdPricingService.ts`, with tests.

**Discount codes:** Single-use and multi-use. Created by admin. Applied at checkout. Stored in `DiscountCode` table.

## Enrollment Flow

```
1. Visitor browses /pricing
2. Picks tier → POST /api/checkout (creates PayMongo Checkout Session via PaymentGateway port)
3. Redirected to PayMongo-hosted payment page
4. Pays via GCash / Maya / card / bank
5. PayMongo webhook POST /api/paymongo/webhook → server verifies signature
6. HandlePaymentWebhook use case:
   a. Verifies signature (PayMongoGateway)
   b. Loads checkout + course (PaymentRepository, CourseRepository)
   c. Checks idempotency (PaymentRepository)
   d. In a single DB transaction:
      - Create Payment row
      - Create Enrollment row
      - Create Receipt row
      - Send confirmation email (EmailSender)
      - Award first-touch XP (XPService) + "New enrollment" badge
   e. Returns Result.ok
7. User clicks email link → already logged in or sent to signup → lands in dashboard
```

### State Machine

```
   start
     │
     ▼
   [pending]  ───── expires (30 min) ──→ [expired]
     │                                       │
     │ payment.paid                          │
     ▼                                       │
  [completed]  (Payment + Enrollment          │
     │          + Receipt + Email sent)       │
     │                                       │
     ├──── refund.created ──→ [refunded]  (Enrollment.revoked = true)
     │
     └──── admin.revoke ────→ [revoked]   (admin action, audit logged)
```

Each state is a column on the relevant row (`Checkout.status`, `Payment.status`, `Enrollment.status`). Discriminated unions in the domain, string enums in the database.

### Idempotency

- `Checkout.idempotencyKey` is server-generated, stored on the row, sent to PayMongo as the `reference` field.
- Replays of the same `payment.paid` webhook with the same PayMongo event ID are no-ops (the `HandlePaymentWebhook` use case checks `WebhookEvent.processedAt` before doing anything).
- Replays of the same `payment.paid` with a different event ID but the same `reference` (extremely rare) trigger a `WebhookError.AmbiguousEvent` to Sentry. Operator investigates.

## Refund Flow

### Within Window (default 7 days)

```
1. User clicks "Request refund" on /payments/[id]
2. POST /api/refunds (or refundAction server action)
3. RequestRefund use case:
   a. Loads payment (PaymentRepository)
   b. Checks window: now - payment.createdAt <= 7 days
   c. Calls PaymentGateway.refund(paymentId, payment.amount)
   d. In a single DB transaction:
      - Create Refund row
      - Update Payment.status = "refunded"
      - Update Enrollment.revoked = true, revokedAt, revokedReason
      - Send refund email (EmailSender)
   e. Returns Result.ok
```

### Outside Window (Admin Override)

```
1. Admin opens /admin/payments/[id]
2. Clicks "Issue refund (override)"
3. Enters reason (20+ chars, validated)
4. AdminIssueRefund use case:
   a. Same as above, but no window check
   b. AuditLog entry: actor=adminId, target=paymentId, event="admin.refund_override", metadata={reason}
   c. Email includes "Issued by support" line
```

## Receipts

Every successful payment creates a `Receipt` row and a PDF. The PDF is rendered by `ReactPdfRenderer` (the `PdfRenderer` port), uploaded to Vercel Blob, and the URL is stored on `Receipt.pdfUrl`. Receipts are publicly viewable by hash (same pattern as certificates). Refunded payments render a new PDF with a "REFUNDED" watermark.

Receipts are BIR-compliant for Philippine peso sales:
- Business name, TIN, address (from `BusinessProfile` table, admin-managed)
- Customer name and email
- Item description, quantity (1), unit price, total
- VAT-inclusive total (PHP sales < ₱3M are VAT-exempt; once we cross that, this is the place to add VAT breakdown)
- Receipt number, date, payment method, reference number

## Tier-Based Content Gating

Implemented by the `AccessPolicy` port (`src/ports/services/AccessPolicy.ts`).

```ts
export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "not_enrolled" | "tier_insufficient" | "enrollment_revoked" | "course_not_found" };

export interface AccessPolicy {
  canAccessCourse(user: UserSnapshot, course: Course): Promise<AccessDecision>;
  canUseSimulator(user: UserSnapshot, sim: Simulator<unknown, unknown>): Promise<AccessDecision>;
  canRequestRefund(user: UserSnapshot, payment: Payment): Promise<AccessDecision>;
  canIssueCertificate(user: UserSnapshot, course: Course): Promise<AccessDecision>;
}
```

| Resource | Foundations | Mastery | Ultimate | Admin |
|----------|-------------|---------|----------|-------|
| Foundations course | yes | yes | yes | yes |
| Mastery course | no | yes | yes | yes |
| Ultimate course | no | no | yes | yes |
| All-access pass holders | yes | yes | yes | yes |
| Campaign Builder | yes | yes | yes | yes |
| Bid Elevator | yes | yes | yes | yes |
| STR Triage | yes | yes | yes | yes |
| Listing Audit | no | yes | yes | yes |
| Keyword Research | no | yes | yes | yes |
| Live classes (RSVP) | no | no | yes | yes |
| Recordings archive | no | no | yes | yes |
| Certificate download | on completion | on completion | on completion | n/a |
| `/admin/*` | no | no | no | yes (super_admin only for impersonate) |

The `AccessPolicy` implementation is a single class that reads from the registry and the user's enrollments. It is the only place these rules are encoded. UI and server actions both ask it, so the rule lives in one place. ISP, DIP.

## Discount Codes

| Attribute | Description |
|-----------|-------------|
| `code` | Unique, 4–32 chars, uppercase alphanumeric |
| `type` | `percent` or `fixed` |
| `value` | For percent: 1–100. For fixed: integer minor units. |
| `validCourseIds` | Empty = valid for all courses. Otherwise: explicit list. |
| `validFrom` / `validUntil` | Optional window. Null = no bound. |
| `maxUses` | Null = unlimited. Integer = max total uses. |
| `currentUses` | Denormalized counter, rebuilt nightly from `DiscountCodeUse` table. |
| `singleUsePerUser` | If true, a user can use the code once. Otherwise, subject to `maxUses`. |
| `stacksWithEarlyBird` | If false, applying a discount code disables the early-bird price. Default false. |

Discount codes are applied in the `StartCheckout` use case, after pricing is quoted but before the PayMongo call. The code, the original price, the discount, and the final price are all stored on the `Checkout` row for audit. The `Payment.amount` matches the final price, not the original.

## State Machines

### Payment

```
   [pending]  ── payment.paid ──→ [completed]  ── refund.created ──→ [refunded]
     │                              │                                   │
     ├─ payment.failed ─→ [failed]  └─ admin.fraud ──→ [flagged]        └─ (terminal)
     │
     └─ checkout.expired ─→ [expired]  (terminal)
```

### Enrollment

```
   [active]  ── refund ──→ [revoked]
     │                       │
     ├─ admin.revoke ──→ [revoked]
     │
     └─ (terminal: revoked enrollments are kept for audit but filtered from access checks)
```

### Refund

```
   [pending]  ── gateway.ack ──→ [completed]  (terminal)
     │
     ├─ gateway.error ──→ [failed]  (terminal, operator investigates)
     │
     └─ timeout (24h) ──→ [timeout]  (terminal, operator investigates)
```

## What Lives Where

| Concern | Domain | Port | Use case | Adapter |
|---------|--------|------|----------|---------|
| `Money` arithmetic | `src/lib/Money.ts` | — | — | — |
| Pricing rules | `src/domain/payments/rules/` | — | — | — |
| Tier ↔ Course mapping | `src/domain/courses/` | — | — | — |
| `Payment.amount` integrity | `src/domain/payments/Payment.ts` | — | — | — |
| PayMongo call | — | `PaymentGateway` | `StartCheckout` | `PayMongoGateway` |
| Webhook handling | `src/domain/payments/WebhookEvent.ts` | `PaymentGateway` | `HandlePaymentWebhook` | `PayMongoGateway` |
| Discount code lookup | — | `DiscountCodeRepository` | `StartCheckout` | `PrismaDiscountCodeRepository` |
| Refund policy (window, etc.) | `src/domain/payments/rules/canRequestRefund.ts` | — | `RequestRefund` | — |
| PayMongo refund call | — | `PaymentGateway` | `RequestRefund` | `PayMongoGateway` |
| Tier-gating decisions | `src/domain/courses/rules/canAccessCourse.ts` | `AccessPolicy` | every use case | `TierAccessPolicy` |
| PDF rendering | — | `PdfRenderer` | `IssueCertificate`, `HandlePaymentWebhook` | `ReactPdfRenderer` |
| Email send | — | `EmailSender` | `HandlePaymentWebhook`, `RequestRefund`, `IssueCertificate` | `ResendEmailSender` |

The business rules are in `domain/`. The orchestration is in `usecases/`. The outside world is in `infra/`. The wire-up is in `composition/`. Pages and actions are thin.
