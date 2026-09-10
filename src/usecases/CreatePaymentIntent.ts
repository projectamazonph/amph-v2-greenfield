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
import { InstallmentPlan } from "@/domain/values/InstallmentPlan";
import type { IPricingTierRepository } from "@/ports/repositories/IPricingTierRepository";
import { resolveCheckoutOffer } from "@/usecases/GetCheckoutSummary";

export interface CreatePaymentIntentInput {
  userId: string;
  courseSlug?: string;
  pricingTierSlug?: string;
  /**
   * P0-01: requested card-installment tenure in months (3, 6, or 12).
   * Absent means pay in full. Honored only when the
   * INSTALLMENTS_ENABLED flag is on (see deps).
   */
  installmentMonths?: number;
}

export type CreatePaymentIntentError =
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "pricing_tier_not_found" }
  | { kind: "pricing_tier_unavailable" }
  | { kind: "already_enrolled" }
  | { kind: "installments_disabled" }
  | { kind: "invalid_installment_term"; months: number }
  | { kind: "installment_below_minimum"; totalMinor: number; minimumMinor: number }
  | { kind: "payment_error"; message: string }
  | { kind: "invalid_transition"; message: string };

export type CreatePaymentIntentOutput =
  | { ok: true; checkoutUrl: string; orderId: string; installmentMonths: number | null }
  | { ok: false; error: CreatePaymentIntentError };

export interface CreatePaymentIntentDeps {
  courseRepo: CourseRepository;
  pricingTierRepo: IPricingTierRepository;
  orderRepo: IOrderRepository;
  paymentGateway: IPaymentGateway;
  baseUrl: string;
  /**
   * P0-01: master switch for card installments, wired from the
   * INSTALLMENTS_ENABLED env var in the composition root.
   * Tests pass true/false explicitly; there is no silent default.
   */
  installmentsEnabled: boolean;
}

export class CreatePaymentIntent {
  constructor(private readonly deps: CreatePaymentIntentDeps) {}

  async execute(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    const { courseRepo, pricingTierRepo, orderRepo, paymentGateway, baseUrl } = this.deps;
    const offerResult = await resolveCheckoutOffer(
      { courseRepo, pricingTierRepo },
      { courseSlug: input.courseSlug, pricingTierSlug: input.pricingTierSlug },
    );
    if (!offerResult.ok) return { ok: false, error: offerResult.error };
    const { course, price } = offerResult.value;

    // ── 2b. P0-01: validate the installment request before any IO ─
    let plan: InstallmentPlan | null = null;
    if (input.installmentMonths !== undefined) {
      if (!this.deps.installmentsEnabled) {
        return { ok: false, error: { kind: "installments_disabled" } };
      }
      const planResult = InstallmentPlan.create({
        totalMinor: price.minor,
        months: input.installmentMonths,
      });
      if (!planResult.ok) {
        const err = planResult.error;
        return {
          ok: false,
          error:
            err.kind === "invalid_term"
              ? { kind: "invalid_installment_term", months: err.months }
              : {
                  kind: "installment_below_minimum",
                  totalMinor: err.totalMinor,
                  minimumMinor: err.minimumMinor,
                },
        };
      }
      plan = planResult.value;
    }

    // ── 3. Fail fast: user must not already have a PAID order ─
    const existingOrders = await orderRepo.findByUserId(input.userId);
    if (Result.isOk(existingOrders)) {
      const alreadyPaid = existingOrders.value.some((o) => o.courseId === course.id && o.isPaid());
      if (alreadyPaid) {
        return { ok: false, error: { kind: "already_enrolled" } };
      }
    }

    // ── 4. Reuse existing pending checkout if one exists ─────
    // P0-01: the pending order must match the installment choice —
    // a full-payment checkout URL must never satisfy an installment
    // request (or vice versa).
    if (Result.isOk(existingOrders)) {
      const pendingOrder = existingOrders.value.find(
        (o) =>
          o.courseId === course.id &&
          o.status === "PENDING" &&
          o.totalMinor === price.minor &&
          o.paymongoCheckoutUrl !== null &&
          (o.installmentMonths ?? undefined) === input.installmentMonths,
      );
      if (pendingOrder && pendingOrder.paymongoCheckoutUrl) {
        return {
          ok: true,
          checkoutUrl: pendingOrder.paymongoCheckoutUrl,
          orderId: pendingOrder.id,
          installmentMonths: pendingOrder.installmentMonths,
        };
      }
    }

    // ── 5. Create Order in DRAFT ───────────────────────────────
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const order = Order.create({
      id: orderId,
      userId: input.userId,
      courseId: course.id,
      subtotalMinor: price.minor,
      discountMinor: 0,
      totalMinor: price.minor,
      currency: price.currency,
    });

    const createResult = await orderRepo.create(order);
    if (Result.isErr(createResult)) {
      return { ok: false, error: { kind: "payment_error", message: "Could not create order" } };
    }

    // ── 5b. P0-01: record the validated installment plan on the DRAFT order
    if (plan) {
      const planResult = order.setInstallmentPlan(plan.months, plan.monthlyMinor);
      if (!planResult.ok) {
        return {
          ok: false,
          error: { kind: "invalid_transition", message: planResult.error.message },
        };
      }
    }

    // ── 6. Call PayMongo ──────────────────────────────────────
    const checkoutResult = await paymentGateway.createCheckoutSession({
      courseId: course.id,
      courseTitle: course.title,
      amountMinor: price.minor,
      currency: price.currency,
      successUrl: `${baseUrl}/checkout/success?orderId=${order.id}`,
      failedUrl: `${baseUrl}/checkout/failed?orderId=${order.id}`,
      metadata: {
        orderId: order.id,
        userId: input.userId,
        courseId: course.id,
        ...(input.pricingTierSlug ? { pricingTierSlug: input.pricingTierSlug } : {}),
        ...(plan ? { installmentMonths: String(plan.months) } : {}),
      },
      ...(plan ? { installments: { terms: [plan.months] } } : {}),
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
    const markResult = order.markPending(checkoutResult.value.id, checkoutResult.value.url);
    if (!markResult.ok)
      return {
        ok: false,
        error: { kind: "invalid_transition", message: markResult.error.message },
      };
    const updateResult = await orderRepo.update(order);
    if (Result.isErr(updateResult)) {
      return {
        ok: false,
        error: { kind: "payment_error", message: "Could not save order" },
      };
    }

    return {
      ok: true,
      checkoutUrl: checkoutResult.value.url,
      orderId: order.id,
      installmentMonths: order.installmentMonths,
    };
  }
}
