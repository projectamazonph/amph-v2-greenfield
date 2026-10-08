/**
 * OrderRefund — domain values and helpers for refund logic.
 *
 * STORY-025: RequestRefund use case + /api/refunds.
 */

import type { Order } from "@/domain/entities/Order";

/**
 * Refund window: 30 days from the original payment date.
 */
export const REFUND_WINDOW_DAYS = 30;

/**
 * Is a paid order within the 30-day refund window?
 *
 * The window is open from paymongoPaidAt (inclusive) up to
 * paymongoPaidAt + REFUND_WINDOW_DAYS days (exclusive).
 *
 * Returns false if paymongoPaidAt is null.
 */
export function isWithinRefundWindow(order: Order, now: Date): boolean {
  if (order.paymongoPaidAt === null) return false;

  const deadline = new Date(order.paymongoPaidAt);
  deadline.setDate(deadline.getDate() + REFUND_WINDOW_DAYS);

  return now < deadline;
}
