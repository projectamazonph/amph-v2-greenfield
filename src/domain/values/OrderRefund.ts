import type { Order } from "@/domain/entities/Order";

/**
 * Refund window: 7 days from the original payment date.
 *
 * One source of truth for both the student path (RequestRefund) and
 * the admin path (ProcessRefund). RefundOverride deliberately bypasses
 * this constant.
 */
export const REFUND_WINDOW_DAYS = 7;
export const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Is a paid order within the 7-day refund window?
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
