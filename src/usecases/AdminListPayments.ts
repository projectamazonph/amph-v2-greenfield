/**
 * AdminListPayments — admin list view of all orders.
 *
 * STORY-049. Filters by status (optional). Email search happens in
 * the use case layer (it joins against userRepo).
 */

import { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { User } from "@/domain/entities/User";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export interface AdminListPaymentsInput {
  status?: PaymentStatus;
  userEmailSearch?: string;
}

export type AdminListPaymentsError =
  | OrderError
  | { kind: "user_error"; message: string };

export type AdminListPaymentsResult = Result<
  { orders: readonly Order[]; users: ReadonlyMap<string, User> },
  AdminListPaymentsError
>;

export interface AdminListPaymentsDeps {
  orderRepo: IOrderRepository;
  userRepo: UserRepository;
}

export class AdminListPayments {
  constructor(private readonly deps: AdminListPaymentsDeps) {}

  async execute(input: AdminListPaymentsInput): Promise<AdminListPaymentsResult> {
    const listResult = await this.deps.orderRepo.listAll({ status: input.status });
    if (!listResult.ok) {
      return Result.err(listResult.error);
    }

    const search = input.userEmailSearch?.toLowerCase().trim();
    let filtered = listResult.value;

    if (search) {
      // Fetch unique user ids, look them up, then filter.
      const userIds = new Set(filtered.map((o) => o.userId));
      const users = new Map<string, User>();
      for (const userId of userIds) {
        const r = await this.deps.userRepo.findById(userId);
        if (!r.ok) {
          return Result.err({ kind: "user_error", message: String(r.error.kind) });
        }
        if (r.value.email.toLowerCase().includes(search)) {
          users.set(userId, r.value);
        }
      }
      filtered = filtered.filter((o) => users.has(o.userId));
      return Result.ok({ orders: filtered, users });
    }

    return Result.ok({ orders: filtered, users: new Map() });
  }
}
