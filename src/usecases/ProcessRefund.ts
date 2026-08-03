/**
 * ProcessRefund — admin issues a refund on a paid order.
 *
 * STORY-049. Standard path: validates 30-day window + no prior
 * refund request. Bypasses both via RefundOverride.
 *
 * Flow:
 *  1. Find order
 *  2. Validate: order is PAID, amountMinor <= totalMinor, within 30 days, no existing refund request
 *  3. Call paymentGateway.refund()
 *  4. On success: order.markRefunded(reason, amountMinor) + persist
 */

import { Result } from "@/domain/shared/Result";
import { isWithinRefundWindow } from "@/domain/values/OrderRefund";
import type { Order } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import type { Clock } from "@/ports/system/Clock";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { RefundRenderer } from "@/ports/email/RefundRenderer";
import type { Logger } from "@/ports/observability/Logger";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";

export interface ProcessRefundInput {
  orderId: string;
  amountMinor: number;
  reason: string;
}

export type ProcessRefundError =
  | { kind: "order_not_found" }
  | { kind: "not_paid" }
  | { kind: "amount_exceeds_total" }
  | { kind: "outside_refund_window" }
  | { kind: "already_refunded" }
  | { kind: "refund_failed"; message: string }
  | { kind: "no_paymongo_payment_id" }
  | { kind: "invalid_amount" }
  | OrderError;

export type ProcessRefundResult = Result<{ order: Order; refundId: string }, ProcessRefundError>;

export interface ProcessRefundDeps {
  orderRepo: IOrderRepository;
  paymentGateway: IPaymentGateway;
  clock: Clock;
  courseRepo: CourseRepository;
  userRepo: UserRepository;
  emailSender: EmailSender;
  refundEmailRenderer: RefundRenderer;
  logger: Logger;
  emailTemplateRepo: IEmailTemplateRepository;
}

export class ProcessRefund {
  constructor(private readonly deps: ProcessRefundDeps) {}

  async execute(input: ProcessRefundInput): Promise<ProcessRefundResult> {
    // ── 1. Find order ───────────────────────────────────────
    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return Result.err(orderResult.error);
    }
    const order = orderResult.value;

    // ── 2. Validate ────────────────────────────────────────
    if (order.status === "REFUNDED" || order.refundProcessedAt !== null) {
      return Result.err({ kind: "already_refunded" });
    }
    if (order.status !== "PAID") {
      return Result.err({ kind: "not_paid" });
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      return Result.err({ kind: "invalid_amount" });
    }
    if (input.amountMinor > order.totalMinor) {
      return Result.err({ kind: "amount_exceeds_total" });
    }
    if (order.paymongoPaidAt && !isWithinRefundWindow(order, this.deps.clock.now())) {
      return Result.err({ kind: "outside_refund_window" });
    }
    if (!order.paymongoPaymentId) {
      return Result.err({ kind: "no_paymongo_payment_id" });
    }

    // ── 3. Call gateway ─────────────────────────────────────
    const refundResult = await this.deps.paymentGateway.refund({
      paymongoPaymentId: order.paymongoPaymentId,
      amountMinor: input.amountMinor,
      reason: input.reason,
    });
    if (!refundResult.ok) {
      return Result.err({
        kind: "refund_failed",
        message: refundResult.error.message,
      });
    }

    // ── 4. Mark refunded + persist ──────────────────────────
    order.markRefunded(input.reason, input.amountMinor);
    const persistResult = await this.deps.orderRepo.update(order);
    if (!persistResult.ok) {
      return Result.err(persistResult.error);
    }

    // ── 5. Send the refund-processed email (best-effort) ───
    await sendRefundEmail(this.deps, persistResult.value, input.reason);

    return Result.ok({
      order: persistResult.value,
      refundId: refundResult.value.refundId,
    });
  }
}

/**
 * Shared by ProcessRefund and RefundOverride — both mark an order
 * refunded via the same paymentGateway.refund() + order.markRefunded()
 * shape, so the confirmation email fires the same way from either path.
 */
export async function sendRefundEmail(
  deps: {
    userRepo: UserRepository;
    courseRepo: CourseRepository;
    emailSender: EmailSender;
    refundEmailRenderer: RefundRenderer;
    logger: Logger;
    emailTemplateRepo: IEmailTemplateRepository;
  },
  order: Order,
  reason: string,
): Promise<void> {
  const [userResult, courseResult] = await Promise.all([
    deps.userRepo.findById(order.userId),
    deps.courseRepo.findById(order.courseId),
  ]);
  if (!userResult.ok || !courseResult.ok) {
    deps.logger.warn("refund.email_skipped_lookup_failed", {
      orderId: order.id,
      userFound: userResult.ok,
      courseFound: courseResult.ok,
    });
    return;
  }

  const templateResult = await deps.emailTemplateRepo.findByType("refund");
  const template = templateResult.ok ? templateResult.value : null;
  const sendResult = await deps.emailSender.send({
    to: userResult.value.email,
    subject: template?.subject ?? `Refund processed for ${order.id}`,
    react: deps.refundEmailRenderer.render({
      firstName: userResult.value.firstName,
      orderNumber: order.id,
      courseTitle: courseResult.value.title,
      amountMinor: order.refundAmountMinor ?? order.totalMinor,
      currency: order.currency,
      refundedAt: order.refundProcessedAt ?? new Date(),
      reason,
      headlineOverride: template?.headline,
      introBodyOverride: template?.introBody,
    }),
  });
  if (!sendResult.ok) {
    deps.logger.warn("refund.email_send_failed", {
      orderId: order.id,
      error: sendResult.error,
    });
  }
}
