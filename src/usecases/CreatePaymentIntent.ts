/**
 * CreatePaymentIntent — Story 021.
 *
 * Creates a PayMongo checkout session for a student purchasing a course.
 *
 * Flow:
 *  1. Validate course exists and is published
 *  2. Check student isn't already enrolled (no PAID order for this course)
 *  3. Create an Order in DRAFT state
 *  4. Call PayMongo to create a Checkout Session
 *  5. Transition Order to PENDING with checkout URL
 *  6. Return checkout URL to the caller
 *
 * SRP: One responsibility — initiate a payment.
 * Fail Fast: Invalid inputs rejected before touching external services.
 */

import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import { Order } from "@/domain/entities/Order";

export interface CreatePaymentIntentInput {
  userId: string;
  courseSlug: string;
}

export type CreatePaymentIntentError =
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "already_enrolled" }
  | { kind: "payment_error"; message: string };

export type CreatePaymentIntentOutput =
  | { ok: true; checkoutUrl: string; orderId: string }
  | { ok: false; error: CreatePaymentIntentError };

export interface CreatePaymentIntentDeps {
  courseRepo: CourseRepository;
  orderRepo: IOrderRepository;
  paymentGateway: IPaymentGateway;
  baseUrl: string;
}

export class CreatePaymentIntent {
  constructor(private readonly deps: CreatePaymentIntentDeps) {}

  async execute(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    const { courseRepo, orderRepo, paymentGateway, baseUrl } = this.deps;

    // ── 1. Fail fast: course must exist ──────────────────────
    const courseResult = await courseRepo.findBySlug(input.courseSlug);
    if (Result.isErr(courseResult)) {
      return { ok: false, error: { kind: "course_not_found" } };
    }
    const course = courseResult.value;

    // ── 2. Fail fast: course must be published ────────────────
    if (course.status !== "PUBLISHED") {
      return { ok: false, error: { kind: "course_not_published" } };
    }

    // ── 3. Fail fast: user must not already have a PAID order ─
    const existingOrders = await orderRepo.findByUserId(input.userId);
    if (Result.isOk(existingOrders)) {
      const alreadyPaid = existingOrders.value.some(
        (o) => o.courseId === course.id && o.isPaid(),
      );
      if (alreadyPaid) {
        return { ok: false, error: { kind: "already_enrolled" } };
      }
    }

    // ── 4. Reuse existing pending checkout if one exists ─────
    if (Result.isOk(existingOrders)) {
      const pendingOrder = existingOrders.value.find(
        (o) => o.courseId === course.id && o.status === "PENDING" && o.paymongoCheckoutUrl !== null,
      );
      if (pendingOrder && pendingOrder.paymongoCheckoutUrl) {
        return { ok: true, checkoutUrl: pendingOrder.paymongoCheckoutUrl, orderId: pendingOrder.id };
      }
    }

    // ── 5. Create Order in DRAFT ───────────────────────────────
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const order = Order.create({
      id: orderId,
      userId: input.userId,
      courseId: course.id,
      subtotalMinor: course.price.minor,
      discountMinor: 0,
      totalMinor: course.price.minor,
      currency: course.price.currency,
    });

    const createResult = await orderRepo.create(order);
    if (Result.isErr(createResult)) {
      return { ok: false, error: { kind: "payment_error", message: "Could not create order" } };
    }

    // ── 6. Call PayMongo ──────────────────────────────────────
    const checkoutResult = await paymentGateway.createCheckoutSession({
      courseId: course.id,
      courseTitle: course.title,
      amountMinor: course.price.minor,
      currency: course.price.currency,
      successUrl: `${baseUrl}/checkout/success?orderId=${order.id}`,
      failedUrl:  `${baseUrl}/checkout/failed?orderId=${order.id}`,
      metadata: {
        orderId: order.id,
        userId: input.userId,
        courseId: course.id,
      },
    });

    if (Result.isErr(checkoutResult)) {
      return {
        ok: false,
        error: {
          kind: "payment_error",
          message: checkoutResult.error.message,
        },
      };
    }

    // ── 7. Transition Order to PENDING ────────────────────────
    order.markPending(checkoutResult.value.id, checkoutResult.value.url);
    await orderRepo.update(order);

    return { ok: true, checkoutUrl: checkoutResult.value.url, orderId: order.id };
  }
}
