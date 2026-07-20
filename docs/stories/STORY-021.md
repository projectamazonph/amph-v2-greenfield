# STORY-021 · PayMongo Checkout

**Sprint:** 2
**Points:** 3
**Epic:** Payments
**Dependencies:** STORY-008 (Course entity), STORY-016-017 (Enrollment), STORY-013 (JWT auth)
**Status:** ⚠️ Partially Done — the PayMongo side is in place (`CreatePaymentIntent` use case, `src/app/api/webhooks/paymongo/route.ts` handler, `RefundOverride` use case, `ProcessRefund` use case) but the **`/checkout` page** that redirects to the hosted checkout is **not yet built**. Without it, the user-facing flow that the spec describes (click "Enroll → Pay" → redirect to PayMongo → return) is not reachable. The closest existing path is `src/app/admin/simulators/new/page.tsx` (admin) — there is no student-facing checkout. Treat this as the next pay-priority feature work.

---

## Goal

A student can purchase a course by clicking "Enroll → Pay" on the course page. They are redirected to PayMongo's hosted checkout, pay, and are redirected back. Behind the scenes, PayMongo sends a webhook that we process to mark the order `paid` and auto-enroll the student.

---

## Domain model

### `PaymentStatus` — value object

Every payment state is one of:

```ts
// src/domain/values/PaymentStatus.ts

export type PaymentStatus =
  | "PENDING"    // Order created, waiting for payment
  | "PAID"       // Payment confirmed by PayMongo webhook
  | "FAILED"     // Payment attempt failed
  | "EXPIRED"    // Checkout session timed out (PayMongo: 24h)
  | "REFUNDED";  // Admin or PayMongo-initiated refund

export const PaymentStatus = {
  isPaid(s: PaymentStatus)      { return s === "PAID"; },
  isFinal(s: PaymentStatus)    { return s === "PAID" || s === "REFUNDED"; },
  isActive(s: PaymentStatus)   { return s === "PENDING"; },
} as const;
```

### `Order` entity — extend with payment fields

The `Order` model already has PayMongo fields in the schema. We add domain methods:

```ts
// src/domain/entities/Order.ts

export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly courseId: string,
    public readonly subtotalMinor: number,
    public readonly discountMinor: number,
    public readonly totalMinor: number,
    public readonly currency: string,
    public status: PaymentStatus,           // ← domain field
    public paymongoPaymentId: string | null,
    public paymongoCheckoutUrl: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  // ── State transitions ─────────────────────────────────────

  markPending(paymongoPaymentId: string, checkoutUrl: string): void {
    if (this.status !== "PENDING") throw new Error(`Cannot mark pending: current status is ${this.status}`);
    this.paymongoPaymentId = paymongoPaymentId;
    this.paymongoCheckoutUrl = checkoutUrl;
    this.status = "PENDING";
    this.updatedAt = new Date();
  }

  markPaid(paidAt = new Date()): void {
    if (this.status !== "PENDING") throw new Error(`Cannot mark paid: current status is ${this.status}`);
    this.status = "PAID";
    this.updatedAt = paidAt;
  }

  markFailed(): void {
    if (this.status !== "PENDING") throw new Error(`Cannot mark failed: current status is ${this.status}`);
    this.status = "FAILED";
    this.updatedAt = new Date();
  }

  markExpired(): void {
    if (this.status !== "PENDING") throw new Error(`Cannot mark expired: current status is ${this.status}`);
    this.status = "EXPIRED";
    this.updatedAt = new Date();
  }

  // ── Guards ────────────────────────────────────────────────

  canTransitionTo(next: PaymentStatus): boolean {
    return this.status === "PENDING" && next === "PAID";
  }

  isPaid(): boolean { return PaymentStatus.isPaid(this.status); }
}
```

---

## Ports

### `IPaymentGateway`

```ts
// src/ports/payment/IPaymentGateway.ts

import type { Result } from "@/domain/shared/Result";

export interface CheckoutSession {
  id: string;          // PayMongo Checkout Session ID (starts with "cs_")
  url: string;         // The hosted checkout URL
  createdAt: Date;
  expiresAt: Date;     // Usually now + 24h
}

export type PaymentGatewayError =
  | { kind: "network_error"; message: string }
  | { kind: "invalid_course"; message: string }
  | { kind: "paymongo_error"; code: string; message: string };

export interface IPaymentGateway {
  /**
   * Create a PayMongo Checkout Session for a given amount.
   * Returns the checkout URL to redirect the student to.
   */
  createCheckoutSession(params: {
    courseId: string;
    courseTitle: string;
    amountMinor: number;   // integer minor units (centavos)
    currency: string;      // "PHP"
    successUrl: string;
    failedUrl: string;
    metadata: Record<string, string>;  // { orderId, userId, courseId }
  }): Promise<Result<CheckoutSession, PaymentGatewayError>>;

  /**
   * Retrieve a Checkout Session by ID.
   */
  getCheckoutSession(sessionId: string): Promise<Result<CheckoutSession, PaymentGatewayError>>;

  /**
   * Verify a webhook signature from PayMongo.
   * Throws if signature is invalid.
   */
  verifyWebhookSignature(payload: string, signature: string): void;
}
```

### `IOrderRepository`

```ts
// src/ports/repositories/OrderRepository.ts

import type { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";

export type OrderError =
  | { kind: "not_found" }
  | { kind: "already_enrolled" }
  | { kind: "db_error"; message: string };

export interface IOrderRepository {
  create(order: Order): Promise<Result<Order, OrderError>>;
  findById(id: string): Promise<Result<Order, OrderError>>;
  findByPaymongoPaymentId(paymongoPaymentId: string): Promise<Result<Order, OrderError>>;
  update(order: Order): Promise<Result<Order, OrderError>>;
  findByUserId(userId: string): Promise<Result<Order[], OrderError>>;
}
```

---

## Use case: `CreatePaymentIntent`

```ts
// src/usecases/CreatePaymentIntent.ts

export interface CreatePaymentIntentInput {
  userId: string;
  courseId: string;
}

export type CreatePaymentIntentError =
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "already_enrolled" }
  | { kind: "payment_error"; message: string };

export type CreatePaymentIntentOutput =
  | { ok: true; checkoutUrl: string; orderId: string }
  | { ok: false; error: CreatePaymentIntentError };

export class CreatePaymentIntent {
  constructor(
    private readonly courseRepo: ICourseRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly config: { baseUrl: string },
  ) {}

  async execute(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    // 1. Fail fast: course must exist
    const courseResult = await this.courseRepo.findBySlug(input.courseId);
    if (Result.isErr(courseResult)) {
      return { ok: false, error: { kind: "course_not_found" } };
    }
    const course = courseResult.value;

    // 2. Fail fast: course must be published
    if (!course.isPublished) {
      return { ok: false, error: { kind: "course_not_published" } };
    }

    // 3. Fail fast: user must not already be enrolled
    const ordersResult = await this.orderRepo.findByUserId(input.userId);
    if (Result.isOk(ordersResult)) {
      const alreadyPaid = ordersResult.value.some(
        o => o.courseId === input.courseId && o.isPaid(),
      );
      if (alreadyPaid) {
        return { ok: false, error: { kind: "already_enrolled" } };
      }
    }

    // 4. Create Order in draft state
    const order = Order.create({
      id: ulid(),                          // from IIdGenerator
      userId: input.userId,
      courseId: course.id,
      subtotalMinor: course.priceMinor,
      discountMinor: 0,
      totalMinor: course.priceMinor,
      currency: course.currency,
    });

    const createResult = await this.orderRepo.create(order);
    if (Result.isErr(createResult)) {
      return { ok: false, error: { kind: "payment_error"; message: "Could not create order" } };
    }

    // 5. Call PayMongo
    const baseUrl = this.config.baseUrl;
    const checkoutResult = await this.paymentGateway.createCheckoutSession({
      courseId: course.id,
      courseTitle: course.title,
      amountMinor: order.totalMinor,
      currency: order.currency,
      successUrl: `${baseUrl}/checkout/success?orderId=${order.id}`,
      failedUrl:  `${baseUrl}/checkout/failed?orderId=${order.id}`,
      metadata: { orderId: order.id, userId: input.userId, courseId: course.id },
    });

    if (Result.isErr(checkoutResult)) {
      return { ok: false, error: { kind: "payment_error"; message: checkoutResult.error.message } };
    }

    // 6. Update Order with PayMongo session ID and checkout URL
    order.markPending(checkoutResult.value.id, checkoutResult.value.url);
    await this.orderRepo.update(order);

    return { ok: true, checkoutUrl: checkoutResult.value.url, orderId: order.id };
  }
}
```

---

## Infrastructure: `PayMongoAdapter`

```ts
// src/infra/payment/PayMongoAdapter.ts

import type { IPaymentGateway, CheckoutSession } from "@/ports/payment/IPaymentGateway";
import type { PaymentGatewayError } from "@/ports/payment/IPaymentGateway";
import { Result } from "@/domain/shared/Result";

export class PayMongoAdapter implements IPaymentGateway {
  private readonly baseUrl = "https://api.paymongo.com/v1";
  private readonly headers: HeadersInit;

  constructor(
    private readonly secretKey: string,
    webhookSecret?: string,
  ) {
    this.headers = {
      Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  async createCheckoutSession(params: {
    courseId: string;
    courseTitle: string;
    amountMinor: number;
    currency: string;
    successUrl: string;
    failedUrl: string;
    metadata: Record<string, string>;
  }): Promise<Result<CheckoutSession, PaymentGatewayError>> {
    try {
      const res = await fetch(`${this.baseUrl}/checkout_sessions`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [{
                name: params.courseTitle,
                quantity: 1,
                price: params.amountMinor,
              }],
              payment_method_types: ["card", "gcash", "grab_pay"],
              success_url: params.successUrl,
              failed_url: params.failedUrl,
              metadata: params.metadata,
            },
          },
        }),
      });

      const json = await res.json() as PaymongoApiResponse;

      if (!res.ok) {
        const err = json.errors?.[0];
        return Result.err({
          kind: "paymongo_error",
          code: String(err?.code ?? "unknown"),
          message: err?.detail ?? "PayMongo API error",
        });
      }

      const attrs = json.data.attributes;
      return Result.ok({
        id: json.data.id,
        url: attrs.checkout_url,
        createdAt: new Date(attrs.created_at * 1000),
        expiresAt: new Date(attrs.expires_at * 1000),
      });
    } catch (e) {
      return Result.err({ kind: "network_error", message: String(e) });
    }
  }

  async getCheckoutSession(sessionId: string): Promise<Result<CheckoutSession, PaymentGatewayError>> {
    try {
      const res = await fetch(`${this.baseUrl}/checkout_sessions/${sessionId}`, {
        headers: this.headers,
      });
      const json = await res.json() as PaymongoApiResponse;
      if (!res.ok) {
        const err = json.errors?.[0];
        return Result.err({ kind: "paymongo_error", code: String(err?.code ?? ""), message: err?.detail ?? "" });
      }
      const attrs = json.data.attributes;
      return Result.ok({ id: json.data.id, url: attrs.checkout_url, createdAt: new Date(attrs.created_at * 1000), expiresAt: new Date(attrs.expires_at * 1000) });
    } catch (e) {
      return Result.err({ kind: "network_error", message: String(e) });
    }
  }

  verifyWebhookSignature(payload: string, signature: string): void {
    // PayMongo uses HMAC-SHA256.
    // Signature header format: "t=timestamp,v1=hmac"
    const parts = Object.fromEntries(signature.split(",").map(p => p.split("=")));
    const timestamp = parts["t"];
    const expected  = parts["v1"];
    const computed  = crypto
      .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET!)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(computed))) {
      throw new Error("Invalid webhook signature");
    }
  }
}

type PaymongoApiResponse = {
  data: {
    id: string;
    attributes: {
      checkout_url: string;
      created_at: number;
      expires_at: number;
    };
  };
  errors?: Array<{ code: string; detail: string }>;
};
```

---

## Webhook handler

```ts
// src/app/api/webhooks/paymongo/route.ts  (Next.js App Router)

import { NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("paymongo-signature") ?? "";
  const rawBody = await req.text();

  const c = buildContainer();

  // 1. Verify signature
  try {
    c.paymentGateway.verifyWebhookSignature(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse event
  const event = JSON.parse(rawBody) as PayMongoWebhookEvent;
  if (event.type !== "checkout_session.completed") {
    return NextResponse.json({ received: true });
  }

  // 3. Find the order
  const sessionId = event.data.id;
  const orderResult = await c.orderRepo.findByPaymongoPaymentId(sessionId);
  if (Result.isErr(orderResult)) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = orderResult.value;

  // 4. Mark paid and enroll
  order.markPaid(new Date(event.data.created_at * 1000));
  await c.orderRepo.update(order);
  await c.enrollStudent.exec({ userId: order.userId, courseId: order.courseId });

  return NextResponse.json({ received: true });
}
```

---

## Test suite

### Unit tests — `CreatePaymentIntent`

```ts
// src/usecases/__tests__/CreatePaymentIntent.test.ts

describe("CreatePaymentIntent", () => {
  it("happy path: creates order and returns checkout URL", async () => { /* ... */ });
  it("course not found: returns error", async () => { /* ... */ });
  it("course not published: returns error", async () => { /* ... */ });
  it("already enrolled: returns error", async () => { /* ... */ });
  it("PayMongo failure: returns payment_error", async () => { /* ... */ });
  it("order already has pending payment: reuses existing checkout URL", async () => { /* ... */ });
});

describe("Order payment state transitions", () => {
  it("newly created order is PENDING", () => { /* ... */ });
  it("markPending sets fields and status", () => { /* ... */ });
  it("markPaid transitions PENDING → PAID", () => { /* ... */ });
  it("markPaid throws if not PENDING", () => { /* ... */ });
  it("markFailed transitions PENDING → FAILED", () => { /* ... */ });
  it("markExpired transitions PENDING → EXPIRED", () => { /* ... */ });
});

describe("PayMongoAdapter", () => {
  it("createCheckoutSession calls PayMongo API with correct params", async () => { /* ... */ });
  it("returns error on network failure", async () => { /* ... */ });
  it("verifyWebhookSignature throws on invalid signature", () => { /* ... */ });
});
```

### Integration test — webhook handler

```ts
// src/app/api/webhooks/paymongo/__tests__/route.test.ts

describe("POST /api/webhooks/paymongo", () => {
  it("returns 401 for invalid signature", async () => { /* ... */ });
  it("marks order paid and enrolls user on checkout_session.completed", async () => { /* ... */ });
  it("ignores unrelated event types", async () => { /* ... */ });
  it("returns 404 if order not found", async () => { /* ... */ });
});
```

---

## Files to create

| File | Action |
|------|--------|
| `src/domain/values/PaymentStatus.ts` | Create |
| `src/domain/entities/Order.ts` | Create |
| `src/ports/payment/IPaymentGateway.ts` | Create |
| `src/ports/repositories/OrderRepository.ts` | Create |
| `src/usecases/CreatePaymentIntent.ts` | Create |
| `src/usecases/__tests__/CreatePaymentIntent.test.ts` | Create |
| `src/infra/payment/PayMongoAdapter.ts` | Create |
| `src/infra/payment/InMemoryPaymentGateway.ts` | Create (test double) |
| `src/infra/repositories/InMemoryOrderRepository.ts` | Create (test double) |
| `src/app/api/webhooks/paymongo/route.ts` | Create |
| `src/app/api/webhooks/paymongo/__tests__/route.test.ts` | Create |
| `src/composition/container.ts` | Modify — wire PayMongoAdapter |
| `tests/unit/domain/entities/Order.test.ts` | Create |
| `tests/unit/domain/values/PaymentStatus.test.ts` | Create |

## Files to modify

| File | Action |
|------|--------|
| `src/composition/container.ts` | Add `orderRepo`, `paymentGateway`, wire `CreatePaymentIntent` |

---

## Acceptance criteria

- [ ] Student clicks "Enroll" → redirected to PayMongo checkout URL
- [ ] PayMongo webhook marks order `PAID` → student auto-enrolled
- [ ] Student lands on `/checkout/success?orderId=...` after payment
- [ ] Failed payment lands on `/checkout/failed?orderId=...`
- [ ] Webhook signature verified (HMAC-SHA256) — reject if tampered
- [ ] Duplicate webhook events are idempotent (order already PAID → no-op)
- [ ] `pnpm typecheck && pnpm test` all green

---

## PayMongo test keys (do not use real keys in tests)

```
Secret key:   sk_test_...
Webhook secret: whsec_...
```

Set in `.env.test`:
```
PAYMONGO_SECRET=sk_test_dummy
PAYMONGO_WEBHOOK_SECRET=whsec_test_dummy
```

---

## Verification

```bash
pnpm typecheck && pnpm test
# All 161 + new tests pass
```

## Definition of Done

- [ ] All files in "Files to create" exist.
- [ ] `PaymentStatus` value object in `src/domain/values/`.
- [ ] `Order` entity with payment state transitions in `src/domain/entities/`.
- [ ] `IPaymentGateway` port with `PayMongoAdapter` in `src/infra/payment/`.
- [ ] `CreatePaymentIntent` use case with unit tests.
- [ ] Webhook handler with integration tests.
- [ ] DI container wires everything together.
- [ ] `pnpm typecheck && pnpm test` all green.
- [ ] Conventional commit: `feat(story-021): PayMongo checkout (STORY-021)`.
- [ ] PR opened against `main`. CI green. Squash merge.
