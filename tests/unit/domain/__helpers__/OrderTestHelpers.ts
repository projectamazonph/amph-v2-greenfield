/**
 * OrderTestHelpers — factory helpers for creating Order entities in tests.
 */

import { Order } from "@/domain/entities/Order";

export class OrderTestHelpers {
  /**
   * Create a PAID order.
   * @param opts.daysAgo — how many days in the past paymongoPaidAt should be (default 0 = today)
   */
  static paidOrder(opts: { daysAgo?: number; userId?: string } = {}): Order {
    const daysAgo = opts.daysAgo ?? 0;
    const paidAt = new Date();
    paidAt.setDate(paidAt.getDate() - daysAgo);

    const order = Order.create({
      id: "ord_test",
      userId: opts.userId ?? "user_test",
      courseId: "course_test",
      subtotalMinor: 10000,
      discountMinor: 0,
      totalMinor: 10000,
      currency: "PHP",
    });
    order.markPending("pm_test", "https://checkout.url");
    order.markPaid(paidAt);
    return order;
  }
}
