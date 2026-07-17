/**
 * Order entity — represents a student's purchase of a course.
 *
 * State machine:
 *   DRAFT → PENDING → PAID    (happy path)
 *                 → FAILED
 *                 → EXPIRED
 *   PAID  → REFUNDED          (admin-initiated)
 */

import { PaymentStatus as _PaymentStatusValues } from "@/domain/values/PaymentStatus";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export interface OrderCreateParams {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
  readonly currency: string;
}

export class Order {
  // ── Core fields ────────────────────────────────────────────
  public readonly id: string;
  public readonly userId: string;
  public readonly courseId: string;
  public readonly subtotalMinor: number;
  public readonly discountMinor: number;
  public readonly totalMinor: number;
  public readonly currency: string;

  // ── Payment fields ──────────────────────────────────────────
  public status: PaymentStatus;
  public paymongoPaymentId: string | null = null;
  public paymongoCheckoutUrl: string | null = null;
  public paymongoStatus: string | null = null;
  public paymongoPaidAt: Date | null = null;

  // ── Refund fields ──────────────────────────────────────────
  public refundReason: string | null = null;
  public refundRequestedAt: Date | null = null;
  public refundProcessedAt: Date | null = null;
  public refundAmountMinor: number | null = null;

  // ── Audit ──────────────────────────────────────────────────
  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(params: OrderCreateParams) {
    this.id = params.id;
    this.userId = params.userId;
    this.courseId = params.courseId;
    this.subtotalMinor = params.subtotalMinor;
    this.discountMinor = params.discountMinor;
    this.totalMinor = params.totalMinor;
    this.currency = params.currency;
    this.status = "DRAFT";
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // ── Factory ────────────────────────────────────────────────

  static create(params: OrderCreateParams): Order {
    return new Order(params);
  }

  // ── State transitions ──────────────────────────────────────

  /**
   * Transition to PENDING: PayMongo checkout session has been created.
   * Only valid from DRAFT.
   */
  markPending(paymongoPaymentId: string, checkoutUrl: string): void {
    if (this.status !== "DRAFT") {
      throw new Error(
        `Cannot mark pending: order is ${this.status}. Can only transition from DRAFT.`,
      );
    }
    this.paymongoPaymentId = paymongoPaymentId;
    this.paymongoCheckoutUrl = checkoutUrl;
    this.status = "PENDING";
    this.updatedAt = new Date();
  }

  /**
   * Transition to PAID: PayMongo has confirmed the payment.
   * Only valid from PENDING.
   */
  markPaid(paidAt = new Date()): void {
    if (this.status !== "PENDING") {
      throw new Error(
        `Cannot mark paid: order is ${this.status}. Can only transition from PENDING.`,
      );
    }
    this.status = "PAID";
    this.paymongoStatus = "paid";
    this.paymongoPaidAt = paidAt;
    this.updatedAt = new Date();
  }

  /**
   * Transition to FAILED: payment attempt failed.
   * Only valid from PENDING.
   */
  markFailed(): void {
    if (this.status !== "PENDING") {
      throw new Error(
        `Cannot mark failed: order is ${this.status}. Can only transition from PENDING.`,
      );
    }
    this.status = "FAILED";
    this.paymongoStatus = "failed";
    this.updatedAt = new Date();
  }

  /**
   * Transition to EXPIRED: checkout session timed out.
   * Only valid from PENDING.
   */
  markExpired(): void {
    if (this.status !== "PENDING") {
      throw new Error(
        `Cannot mark expired: order is ${this.status}. Can only transition from PENDING.`,
      );
    }
    this.status = "EXPIRED";
    this.paymongoStatus = "expired";
    this.updatedAt = new Date();
  }

  /**
   * Transition to REFUNDED: full refund issued.
   * Only valid from PAID.
   */
  markRefunded(reason: string, amountMinor: number): void {
    if (this.status !== "PAID") {
      throw new Error(
        `Cannot mark refunded: order is ${this.status}. Can only transition from PAID.`,
      );
    }
    this.status = "REFUNDED";
    this.refundReason = reason;
    this.refundProcessedAt = new Date();
    this.refundAmountMinor = amountMinor;
    this.updatedAt = new Date();
  }

  // ── Guards ────────────────────────────────────────────────

  isPaid(): boolean {
    return _PaymentStatusValues.isPaid(this.status);
  }

  canTransitionTo(next: PaymentStatus): boolean {
    if (this.status === "DRAFT" && next === "PENDING") return true;
    if (this.status === "PENDING" && next === "PAID")    return true;
    if (this.status === "PENDING" && next === "FAILED")  return true;
    if (this.status === "PENDING" && next === "EXPIRED")  return true;
    if (this.status === "PAID"    && next === "REFUNDED") return true;
    return false;
  }
}
