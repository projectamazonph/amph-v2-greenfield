/**
 * ExportPayments — fetch all orders matching filters for CSV export.
 *
 * P3-85. Paginates through the order repository to avoid loading the
 * entire result set into memory at once. Enriches each order with the
 * buyer's email by batch-fetching users once.
 */

import type { Order } from "@/domain/entities/Order";
import type { User } from "@/domain/entities/User";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export type ExportPaymentsError = OrderError | { kind: "user_error"; message: string };

export interface ExportPaymentsDeps {
  orderRepo: IOrderRepository;
  userRepo: UserRepository;
}

export interface ExportPaymentRow {
  id: string;
  userEmail: string;
  courseId: string;
  totalMinor: number;
  status: PaymentStatus;
  createdAt: string;
}

export class ExportPayments {
  constructor(private readonly deps: ExportPaymentsDeps) {}

  async execute(params: {
    status?: PaymentStatus;
    maxEntries?: number;
  }): Promise<
    | { ok: true; rows: ExportPaymentRow[]; total: number }
    | { ok: false; error: ExportPaymentsError }
  > {
    const maxEntries = params.maxEntries ?? 10_000;
    const BATCH = 50;

    const allOrders: Order[] = [];
    let page = 1;

    while (allOrders.length < maxEntries) {
      const result = await this.deps.orderRepo.listPaginated({
        status: params.status,
        page,
        pageSize: BATCH,
      });
      if (!result.ok) return result;

      const remaining = maxEntries - allOrders.length;
      allOrders.push(...result.value.orders.slice(0, remaining));
      if (result.value.orders.length < BATCH) break;
      page++;
    }

    const total = allOrders.length;

    // Batch-fetch all distinct users
    const userIds = [...new Set(allOrders.map((o) => o.userId))];
    const users = new Map<string, User>();
    for (const userId of userIds) {
      const r = await this.deps.userRepo.findById(userId);
      if (!r.ok) return { ok: false, error: { kind: "user_error", message: String(r.error.kind) } };
      users.set(userId, r.value);
    }

    const rows: ExportPaymentRow[] = allOrders.map((o) => ({
      id: o.id,
      userEmail: users.get(o.userId)?.email ?? o.userId,
      courseId: o.courseId,
      totalMinor: o.totalMinor,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    return { ok: true, rows, total };
  }
}
