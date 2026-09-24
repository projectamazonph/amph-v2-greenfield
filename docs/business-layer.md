# Business Layer — Project Amazon PH Academy v2

**Status:** Approved
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield)
**Last updated:** 2026-08-12 against `ee1737a`

---

## Purpose

The business layer is what turns Project Amazon PH Academy from "free course site" into "paid product business." It covers pricing tiers, the enrollment flow, payment processing via PayMongo, refunds, and tier-based content gating.

**Note on entities:** There is no `Refund` table, but there **is** a `Payment` model (`prisma/schema.prisma:1035`, keyed by `orderId`, with a unique `providerPaymentId` and its own `status` string), so `Order` is not the only place payment state can sit. `Order.status` tracks the lifecycle documented at `prisma/schema.prisma:382` as `DRAFT | PENDING | PAID | FAILED | EXPIRED | REFUNDED`, defaulting to `DRAFT`; `Order.paymongoStatus` mirrors PayMongo's raw status. Receipt PDF generation is implemented (see Receipts). The `BusinessProfile` table for BIR compliance is not implemented.

This spec assumes PayMongo as the payment provider, behind the `IPaymentGateway` port. PayMongo is the right choice because:

An admin manual tier grant is an access-recovery path, not a payment. It creates eligible published-course enrollments for STARTER or PRO, is idempotent, and does not create an Order. A webhook can store PAID before enrollment fails; an already-paid replay returns early, so confirmed-paid partial states are repaired with this audited grant flow.

- Native Philippine peso (PHP) support, no currency conversion fees
- Supports GCash, Maya, GrabPay, bank transfer (InstaPay/PESONet), and credit/debit card
- Cleaner API than alternatives; better developer experience for one-time Philippine peso flows
- Reliable webhook delivery with signature verification
- Test mode well-documented (`sk_test_*` / `pk_test_*` keys)

If we ever need a second provider (e.g. Stripe for international expansion), it is a new adapter in `src/infra/<provider>/` implementing `IPaymentGateway`. No use case or app code changes. OCP, ADR-013.

## Pricing Tiers

Four tiers are seeded, in `scripts/seed-pricing-tiers.ts`. Three are sold as a ladder and the fourth is the bundle at the end of this section:

| Tier                        | Price (minor) | Price (display) | Includes                                                                                                                                                                  |
| --------------------------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PPC Foundations**         | 299900        | ₱2,999          | 5 core modules, basic tools (Campaign Builder, Bid Elevator, STR Triage), quizzes, badges, community access                                                               |
| **Accelerated Mastery**     | 599900        | ₱5,999          | Everything in Foundations + advanced modules (8 total), all scenario packs (kitchen, electronics, garden, fitness, beauty), downloadable resources, live class recordings |
| **Ultimate Transformation** | 999900        | ₱9,999          | Everything in Mastery + weekly live classes with Ryan, 1-on-1 portfolio review (1×/month), private community channel, certificate priority review                         |

Every figure in the table is a `PricingTier.priceMinor` value in integer centavos. There is also a `Course.priceMinor`, and a course attaches to a tier through the nullable `Course.pricingTierId`, but neither of those is what a learner is quoted: `/pricing` renders `effectivePrice(tier, now)` through `ListPricingTiers`, and `GetCheckoutSummary` charges the same `effectivePrice(tier)` when the request carries a `pricingTierSlug`. Tier is a `CourseAccessTier` value object. Editing tier price is admin-only (see admin backend spec).

**Bundle option:** All-Access Pass = ₱14,999 (`priceMinor` 1499900), the fourth seeded row, with no early-bird discount on it. The earlier text here said ₱12,999 and a savings of ₱6,997; that figure matches no seeded row and no code path, so it is dropped rather than corrected, and the saving it promised was arithmetic on a price nobody charges.

**What makes a tier buyable.** Two conditions, both checked in `src/usecases/GetCheckoutSummary.ts`, and neither is an `isActive` flag:

1. `tier.status === "ACTIVE"`, otherwise `pricing_tier_unavailable`. Status is a lifecycle string, `DRAFT` (admin only) → `ACTIVE` (listed on `/pricing`) → `ARCHIVED`, defaulting to `DRAFT` in the schema. The repository lists only ACTIVE rows (`src/infra/repositories/PrismaPricingTierRepository.ts`), and `scripts/seed-pricing-tiers.ts` upserts with `status: "ACTIVE"`.
2. The tier links to a course, and that course is `PUBLISHED`. `findLinkedCourseSlug()` returning nothing is also `pricing_tier_unavailable`.

Consequence worth knowing before a launch: `--with-courses` defaults to false in that seeder, so an ACTIVE tier with no linked course passes the first check and fails the second, and checkout says `pricing_tier_unavailable` with no hint that the missing link is why. `SESSION-HANDOVER.md:877` records that the tiers in the deployed database were seeded without that flag, which this document cannot verify from here; confirm it against the live rows before treating a tier as purchasable. `pnpm db:seed:tiers --with-courses` is what closes a tier's path to checkout.

**Early bird:** A tier may carry `earlyBirdPriceMinor` and `earlyBirdEndsAt`. While the window is open, the lower price is what `/pricing` shows (with a countdown) and what `GetCheckoutSummary` charges; once `earlyBirdEndsAt` passes, the regular price returns on its own. The rule is three pure functions on the entity, `effectivePrice()`, `earlyBirdIsActive()` and `earlyBirdMinutesRemaining()` in `src/domain/entities/PricingTier.ts`, consumed by `ListPricingTiers` and `GetCheckoutSummary`, and covered by `tests/unit/domain/entities/PricingTier.test.ts`. `pnpm db:seed:tiers` (`scripts/seed-pricing-tiers.ts`) seeds Accelerated Mastery at ₱4,999 down from ₱5,999 for 7 days and Ultimate Transformation at ₱7,999 down from ₱9,999 for 3 days; the Foundations and All-Access rows carry no early-bird. Those are seed defaults only: the live rows are `pricing_tiers` and an admin can change or clear them, and a deploy does not re-seed tiers, so treat any peso figure in this document as an example rather than the current price.

**Not implemented:** an early-bird cap measured in enrollments. This section used to read "First 30 enrollments across all tiers pay ₱499", "implemented as a `PricingService` rule", "in `src/infra/pricing/EarlyBirdPricingService.ts`, with tests". None of that is in the repository: there is no `PricingService` symbol in `src/`, no `src/infra/pricing/` directory, no file by that name, nothing anywhere that counts enrollments to close a price, and no ₱499 tier. The window closes on a date. Whether a first-N-enrollments cap is also wanted is an open product decision, recorded in `../STATE.md`.

**Discount codes:** Single-use and multi-use. Created by admin. Applied at checkout. Stored in `DiscountCode` table.

## Enrollment Flow

As built, 2026-09-23. There is no `/api/checkout` route and no `HandlePaymentWebhook`
use case: checkout runs through a server action and fulfillment is inline in the webhook
handler.

```
1. Visitor browses /pricing. ListPricingTiers returns ACTIVE tiers and quotes each one
   through effectivePrice(tier, now), so an open early-bird window is the displayed price.
2. The checkout form posts to src/app/actions/checkout.action.ts, which runs
   CreatePaymentIntent. That creates a hosted Checkout Session through IPaymentGateway
   and creates the Order row locally at the same time.
3. Redirected to the PayMongo-hosted payment page. The adapter requests
   payment_method_types: ["card", "gcash", "grab_pay"]. Maya is not among them, and
   neither is the bank installment option that a P0-01 comment in the adapter mentions.
4. PayMongo posts to /api/webhooks/paymongo. src/proxy.ts guards the prefixes in
   PROTECTED_PREFIXES (/dashboard/, /admin/, /enroll/, /order/), so this path arrives
   with no session attached. The signature check below is what authenticates it.
5. The route handler (src/app/api/webhooks/paymongo/route.ts) verifies the signature
   against the raw body, then records the event with webhookEventLog.record(). The
   record is written before the work runs and closed with markProcessed() afterwards.
6. The order is found by its PayMongo checkout session id. If order.isPaid() is already
   true the handler returns early, and that check, not the event log, is what stops a
   replay from enrolling someone twice.
7. Order status becomes PAID. PaymentStatus has no COMPLETED member.
8. Still inline, still in the route: enrollStudent.execute(), then sendReceiptEmail(),
   then issueInvoice.execute() when INVOICING_ENABLED is set.
9. No step in this path awards XP or grants a badge. XP comes from quiz attempts,
   lessons, live-class recordings and tool use, not from purchase.
10. These steps are sequential awaits with no $transaction wrapper around them, which is
    why a paid event can be recorded before enrollment succeeds. See the recovery note in
    STATE.md's known limitations.
11. User clicks the email link, logs in or signs up, and lands in the dashboard.
```

### State Machine

```
   DRAFT -> PENDING -> PAID -> REFUNDED
```

Written by `CreatePaymentIntent` (DRAFT), the PayMongo webhook (PAID), and `RefundOverride`
or `ProcessRefund` (REFUNDED). The full transition table, including the two states nothing
ever writes, is in State Machines below. Nothing on this path touches `Enrollment.status`;
see Refund Flow.

Each state is a plain `String` column on `Order.status` and `Enrollment.status`, not a database enum. The four real Postgres enums in `prisma/schema.prisma` are `Role`, `SubscriptionTier`, `VerificationStatus` and `SimulatorAccess`. The unions are enforced in the domain on read (`PaymentStatus`, `isEnrollmentStatus()`), and the database will accept a value outside them. `PrismaWebhookEventLog` stores the event, whether the signature validated, and the processing outcome. It is a trail for an operator to read, not a lock: see Idempotency.

### Idempotency

As built, 2026-09-23:

- There is no `Order.paymongoReference` column and the adapter sends no `reference` field. Order-to-payment linkage is the PayMongo checkout session id.
- The only replay guard is `order.isPaid()`, checked in the webhook route before it enrolls anyone. `IWebhookEventLog` exposes `record()` and `markProcessed()` and nothing that reads a row back, so no code can ask whether an event id was already processed. Replaying a stored PAID event therefore exits early because the order is paid, not because the event log said so.
- There is no `WebhookError` type and no `AmbiguousEvent` case anywhere in `src`, so nothing is raised for a second event id pointing at the same order. `markProcessed()` does record an error string against the log row, which is what an operator reads during a replay drill. See `docs/runbooks/webhook-replay.md`.

## Refund Flow

### Refund window: 7 days, single source of truth

```text
1. User opens `/profile/purchases` and submits the refund server action.
2. RequestRefund use case:
   a. Loads order (IOrderRepository)
   b. Checks the reason is 10-500 characters after trimming, then ownership, paid status, the 7-day window from `paymongoPaidAt`, and less than 25% course completion. The window is imported from `src/domain/values/OrderRefund.ts`, which exports `REFUND_WINDOW_DAYS = 7` and `REFUND_WINDOW_MS` derived from it. The completion check reads the enrollment (`progressPercent >= 25` is refused) but never writes to it.
   c. Stores the refund request for admin processing. It does not call PayMongo; no gateway is injected here.
```

`isWithinRefundWindow()` is the same function the admin path uses (`ProcessRefund.ts:87`), so the student-side and admin-side checks now read from one constant. The admin override path (`RefundOverride.ts`) deliberately bypasses the window and is unchanged.

### Outside Window (Admin Override)

Both admin surfaces exist, `src/app/admin/refunds/[orderId]/page.tsx` and
`src/app/admin/payments/[id]/page.tsx`. As built:

```text
1. Admin opens /admin/payments/[id] (the page that carries the override reason form)
   or /admin/refunds/[orderId] (which posts without a reason field at all).
2. RefundOverride use case:
   a. Checks the order is paid, and calls the real PayMongo Refunds API through
      `IPaymentGateway`.
   b. Validates the reason as non-empty. There is no 20-character minimum anywhere in
      `src/usecases/RefundOverride.ts` or in either page.
   c. order.markRefunded() + persist. The gateway call is here, not in RequestRefund.
   d. Records the audited actor, target and reason, then sends the configured refund email.
```

A successful refund now revokes the matching enrollment. Both `ProcessRefund` and
`RefundOverride` share a helper, `revokeEnrollmentForRefund()` in
`src/usecases/ProcessRefund.ts`, that runs after the gateway call and the order
persist. The helper looks up the `(userId, courseId)` enrollment, transitions it
to `cancelled` via `withEnrollmentStatus`, persists through `IEnrollmentRepository.update`,
and writes a new audit row `enrollment.revoked_by_refund` (carrying the `orderId`,
the refund `reason`, and a `trigger` discriminator of `process_refund` vs
`refund_override`). The cancel is best-effort: a missing or already-non-active
enrollment logs at `warn` and continues, since the money has already gone back to
the customer and a rollback would not recover it.

`AuthorizeLessonAccess.ts:105` admits only `status === "active"` enrollments, so the
refund-driven cancel closes the gap between the comment at
`AuthorizeLessonAccess.ts:98` (which always described refunded access as revoked)
and the actual data (which until now left the enrollment `active`). The
manual-cancel path through `AdminSetEnrollmentStatus` still exists and now audits
as `enrollment.revoked`, distinct from `enrollment.revoked_by_refund`, so the audit
log can tell a refund-driven cancel from an admin-driven one.

## Receipts

> **Status: implemented, and this section was stale.** `src/usecases/IssueInvoice.ts` generates the invoice and uploads it, it is wired into `src/composition/container.ts`, and the webhook runs it after enrollment behind the `INVOICING_ENABLED` flag. `Invoice` and `InvoiceLineItem` are real tables in `prisma/schema.prisma`.

What is still true: `BusinessProfile` does not exist as a model or a symbol anywhere, so the business name, TIN and address a BIR-compliant receipt needs are not sourced from a managed record. Confirmation emails remain a learner-facing proof alongside the generated invoice.

## Tier-Based Content Gating

Implemented by the `IAccessPolicy` port (`src/ports/access/IAccessPolicy.ts`). The port
answers one question, about one course, for one user id (empty string = anonymous). The
`canUseSimulator`, `canRequestRefund` and `canIssueCertificate` methods documented here do
not exist anywhere in `src`, and there is no `UserSnapshot` type.

```ts
// src/ports/access/IAccessPolicy.ts: the whole interface
export interface IAccessPolicy {
  canAccess(userId: string, courseId: string): Promise<AccessDecision>;
}

// src/domain/values/AccessDecision.ts: five kinds, discriminated on "kind"
export type AccessDecision =
  | { readonly kind: "allowed" }
  | { readonly kind: "allowed_preview"; readonly previewLessonCount: number }
  | { readonly kind: "denied_tier"; readonly userTier: string; readonly requiredTier: string }
  | { readonly kind: "denied_not_enrolled" }
  | { readonly kind: "denied_not_authenticated" };
```

| Resource                | Foundations   | Mastery       | Ultimate      | Admin                                      |
| ----------------------- | ------------- | ------------- | ------------- | ------------------------------------------ |
| Foundations course      | yes           | yes           | yes           | yes                                        |
| Mastery course          | no            | yes           | yes           | yes                                        |
| Ultimate course         | no            | no            | yes           | yes                                        |
| All-access pass holders | yes           | yes           | yes           | yes                                        |
| Campaign Builder        | yes (ungated) | yes (ungated) | yes (ungated) | yes                                        |
| Bid Elevator            | yes (ungated) | yes (ungated) | yes (ungated) | yes                                        |
| STR Triage              | yes (ungated) | yes (ungated) | yes (ungated) | yes                                        |
| Listing Audit           | yes (ungated) | yes (ungated) | yes (ungated) | yes                                        |
| Keyword Research        | yes (ungated) | yes (ungated) | yes (ungated) | yes                                        |
| Live classes (RSVP)     | see note      | see note      | see note      | yes                                        |
| Recordings archive      | see note      | see note      | see note      | yes                                        |
| Certificate download    | on completion | on completion | on completion | n/a                                        |
| `/admin/*`              | no            | no            | no            | yes; ADMIN can impersonate non-admin users |

**Why the tool rows say "ungated".** All five practice pages live under `src/app/tools/`,
and a grep for `subscriptionTier`, `courseTier`, `enrollment`, `accessPolicy` or
`CheckCourseAccess` across that directory returns nothing. No tool page reads the session or
asks the policy, so every visitor reaches all five engines. The `User.simulatorAccess` enum
does exist (`NONE` / `FORMATIVE` / `CREDENTIAL`) and `PrismaUserRepository.ts:83` writes it on
create, but nothing reads it, so it gates nothing. What the engines do check is per-mode and
per-scenario: a formative run may use a draft scenario, a credential run requires a published
one. That is a scenario-lifecycle rule, not a tier rule. **Whether the tools should be
tier-gated is an open decision.**

**Why the live-class rows say "see note".** `RsvpLiveClass.ts:70` requires an enrollment in
the class's linked course whose status is `active`, and returns `course_access_required`
otherwise. There is no subscription fallback in that use case, and `LiveClass.courseId` is
required (`prisma/schema.prisma:300`), so every class belongs to a course. The gate is
therefore enrollment, not tier: a Foundations student enrolled in that course can RSVP, and an
Ultimate subscriber who is not enrolled cannot. No "Starter and above" or "Ultimate only" rule
exists in the code. Watching a recording takes the same access path plus a
`watchedRecordingAt` stamp that awards XP once.

**Certificates, coaching and the job board describe the offer, not a gate.** A certificate
needs an enrollment plus a passed quiz; there is no coaching feature and no job board in the
codebase.

`TierAccessPolicy` (`src/infra/access/TierAccessPolicy.ts`) is the implementation. It injects
a user repository, a course repository and an enrollment repository. It never sees a
simulator registry, an order, or a refund. In order:

1. Empty `userId`, or the user lookup fails → `denied_not_authenticated`
2. Course missing or not `PUBLISHED` → also `denied_not_authenticated`. There is no
   `course_not_found` kind; an unpublished course is reported as if the caller were anonymous
3. `user.role === "ADMIN"` → `allowed`, before any enrollment or tier check
4. An enrollment whose `status === "active"` → `allowed`. A thrown enrollment lookup fails
   closed to `denied_not_authenticated` rather than surfacing a 500
5. `course.courseTier === "PREVIEW"` → `allowed_preview`, open to any signed-in user,
   carrying `course.previewLessonCount`
6. `subscriptionMeetsCourseTier(user.subscriptionTier, course.courseTier)` → `allowed`
7. Otherwise `denied_tier`, carrying both tier names for the upsell copy

Two consequences the old text hid. Access is granted by a subscription row, never by a paid
order: `TierAccessPolicy` has no order repository, so a purchase that has not also produced
an enrollment or a subscription grants nothing here. And the ladder is `CourseAccessTier`,
not `PricingTier` (`src/domain/values/CourseAccessTier.ts:31`: PRO satisfies anything,
STARTER satisfies STARTER and PREVIEW, FREE satisfies PREVIEW only). The comparison is
`User.subscriptionTier` against `Course.courseTier`. Prices do not gate lessons; a course
priced at ₱9,999 can still be a PREVIEW tier and open to everyone.

The union declares `denied_not_enrolled` and `CheckCourseAccess.ts:50` maps it to the reason
string `not_enrolled`, but no path in `TierAccessPolicy` returns it, so that branch is
unreachable in production. Enrollment status has no `revoked` value either: `EnrollmentStatus`
is `active | cancelled | refunded | expired` (`src/domain/entities/Enrollment.ts:12`).

This is also only the **course** gate. Lesson reading runs through a separate use case,
`AuthorizeLessonAccess`, with its own preview window; see Refund Flow for how the two meet
on a refunded order.

## Discount Codes

Two things carry this name: a domain entity at `src/domain/entities/DiscountCode.ts` and a
Prisma model at `prisma/schema.prisma:563` (`@@map("discount_codes")`). Together:

| Field        | Reality                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `code`       | unique, upper-case; `createDiscountCode` normalises with `trim().toUpperCase()`     |
| `type`       | `DiscountType` = `PERCENTAGE` or `FIXED`. **Only two values.**                      |
| `value`      | a percent (1-100) when `PERCENTAGE`, centavos when `FIXED`                          |
| `maxUses`    | nullable; null = unlimited; negative rejected                                       |
| `usedCount`  | denormalized counter, always created at 0                                           |
| `validFrom`  | nullable start date                                                                 |
| `validUntil` | nullable expiry date                                                                |
| `courseIds`  | `String[]`; empty means every course                                                |
| `archivedAt` | soft delete; hidden from `listAll()`/`findById()`, still returned by `findByCode()` |
| `createdAt`  | database-defaulted                                                                  |

The only code-shape rule is a character class, `/^[A-Z0-9_-]+$/`, plus a non-empty check.
There is no length bound: "4-32 chars" is wrong in both directions, and `_` and `-` are
allowed where "alphanumeric" said they were not.

`singleUsePerUser` and `stacksWithEarlyBird` do not exist, under those names or any other.
Per-user redemption is not implemented: nothing records who used which code. Nor is there a
stacking rule, because there is nothing to stack against: `EARLY_BIRD` is not a discount
type. The early-bird price is a field on `PricingTier`, applied before any code is
considered (see Pricing Tiers), so the documented "early-bird cannot combine with a
percentage code" behaviour has no mechanism behind it. Whether it should is part of the
checkout decision below.

**Discount codes are an operator-only lever.** `CreatePaymentIntent` takes no code parameter and
builds its line with `discountMinor: 0` (`src/usecases/CreatePaymentIntent.ts:147`). There is
no coupon field on the checkout form. The only path through which a discount code reaches an
order today is the admin: from `/admin/payments/[id]`, an admin submits a code, the
`AdminApplyDiscountCode` use case (`src/usecases/AdminApplyDiscountCode.ts`) validates the
code against the same rules `ApplyDiscountCode` uses, mutates the matching PAID order via
`Order.applyAdminDiscount()` (recomputes `totalMinor`), persists, audits
`order.discount_applied`, and calls `IDiscountCodeRepository.incrementUsedCount()` so
`maxUses` is finally reachable by real traffic. The student never sees a coupon field; codes
are a marketing / support tool, not a self-service feature.

What `AdminApplyDiscountCode` checks, in order: the order must be PAID (refused on
DRAFT/PENDING/REFUNDED with `order_not_paid` so totals don't drift from the PayMongo
session, and refunds keep their historical receipt); the order must not already have a
discount applied (`discount_already_applied`, to keep the audit trail trivial); the code
must exist (`code_not_found`), not be expired (`code_expired`), not be before its start
date (`code_not_started`), not be at `maxUses` (`code_maxed_out`), and apply to the order's
course (`code_not_applicable`); and the calculated discount must be in `(0, subtotalMinor]`.
It then runs `Order.applyAdminDiscount()`, persists, audits, and increments
`usedCount`. `ApplyDiscountCode.execute()` (the older use case) remains as a pure validator
but has no caller; the admin path uses `AdminApplyDiscountCode` directly.

Note that the standalone `ApplyDiscountCode` does **not** check `archivedAt`, so an archived
code still validates through the public validator's rules even though the repository hides
it from `listAll()` / `findById()`. The admin path enforces an additional course-applicability
check that the validator also does, so the admin cannot accidentally apply a code the
learner-facing path would have refused.

The maths, from `calculateDiscount`: `PERCENTAGE` is `Math.floor(subtotalMinor * value / 100)`
(floored, not rounded), and `FIXED` is `Math.min(value, subtotalMinor)`, so a fixed code can
never discount past the subtotal. A percentage above 100 is refused earlier, by
`createDiscountCode`.

The audit columns exist: `subtotalMinor`, `discountMinor`, `platformFeeMinor`, `totalMinor`
(all integer minor units, `prisma/schema.prisma:386-389`). `totalMinor` is what the gateway is
asked to charge, so a discount that was never applied is simply absent rather than mismatched.
There is no `Order.amount` field, and `IssueInvoice` does not itemise a discount: it emits one
line at `order.totalMinor` and its own comment says discounts collapse into the net amount.

Use tracking: `incrementUsedCount()` is declared on the port
(`src/ports/repositories/IDiscountCodeRepository.ts:61`) and implemented by both repositories,
and it has **no caller outside tests**. Since no learner can redeem a code, nothing is ever
counted: `usedCount` stays at 0 in production and `maxUses` can never be reached by real
traffic. There is no `DiscountCodeUse` table and no order-history check.

## State Machines

### Order / Payment

```
   [PENDING]  ----- payment.paid -----> [PAID]  ----- refund created -----> [REFUNDED]
     │
     ├- payment.failed ----> [FAILED]    markFailed() at Order.ts:186
     └- checkout.expired --> [EXPIRED]   markExpired() at Order.ts:203
```

There is no `[completed]` and no `[flagged]` state. `markFailed()` and `markExpired()` exist
on the entity and have no production caller, so nothing sets FAILED or EXPIRED today: an
abandoned checkout stays PENDING forever, even though the PayMongo session behind it expires
after about 24 hours. `Order.status` is a plain String and would accept either word.

Refund state lives on `Order.status` plus `refundReason`, `refundRequestedAt`,
`refundProcessedAt` and `refundAmountMinor` (`prisma/schema.prisma:410-413`). There is no
`Refund` table. `Payment` is a separate model, but nothing in the refund path writes it.

### Enrollment

```
   [active]  ---- AdminSetEnrollmentStatus ----> [cancelled]
     │
     └---- AdminSetEnrollmentStatus ------------> [refunded]
```

The four values are `active | cancelled | refunded | expired`
(`src/domain/entities/Enrollment.ts:12`, re-validated on read by `isEnrollmentStatus()` at
`:28`; the column itself is a plain String at `prisma/schema.prisma:352`). There is no
`revoked` enrollment status: `revokedAt` and `revokedReason` belong to `Certificate`
(`prisma/schema.prisma:772`), whose status is `active | revoked`.

`expired` is a storable value, but nothing transitions an enrollment into it and the domain
entity carries no `expiresAt` field, so it is a label with no writer.

`AdminSetEnrollmentStatus` writes the status directly with no order check, and refuses to
restore an enrollment already marked `refunded`.

## What Lives Where

| Concern                 | Domain                                  | Port                                     | Use case                                           | Adapter                        |
| ----------------------- | --------------------------------------- | ---------------------------------------- | -------------------------------------------------- | ------------------------------ |
| `Money` arithmetic      | `src/domain/values/Money.ts`            | -                                        | -                                                  | -                              |
| `Order` entity          | `src/domain/entities/Order.ts`          | -                                        | -                                                  | -                              |
| Refund policy (window)  | `src/domain/values/OrderRefund.ts`      | -                                        | `RequestRefund` (7d) vs `ProcessRefund` (30d)      | -                              |
| Tier <-> Course mapping | `src/domain/values/CourseAccessTier.ts` | -                                        | -                                                  | -                              |
| PayMongo call           | -                                       | `IPaymentGateway`                        | `CreatePaymentIntent`                              | `PayMongoAdapter`              |
| Webhook handling        | -                                       | `IPaymentGateway`                        | none; the route runs it inline                     | `PayMongoAdapter`              |
| Discount code lookup    | `src/domain/entities/DiscountCode.ts`   | `IDiscountCodeRepository`                | `ApplyDiscountCode` (unreachable from checkout)    | `PrismaDiscountCodeRepository` |
| Refund call             | -                                       | `IPaymentGateway` `refund()`             | `ProcessRefund`, `RefundOverride`                  | `PayMongoAdapter`              |
| Tier-gating decisions   | `src/domain/values/CourseAccessTier.ts` | `IAccessPolicy`                          | `CheckCourseAccess`                                | `TierAccessPolicy`             |
| PDF rendering           | -                                       | `CertificateRenderer`, `InvoiceRenderer` | `IssueCertificate`, `IssueInvoice`                 | `ReactPdfCertificateRenderer`  |
| Email send              | -                                       | `EmailSender`                            | webhook route, `RequestRefund`, `IssueCertificate` | `ResendEmailSender`            |

The business rules are in `domain/`. The orchestration is in `usecases/`. The outside world is in `infra/`. The wire-up is in `composition/`. Pages and actions are thin.
