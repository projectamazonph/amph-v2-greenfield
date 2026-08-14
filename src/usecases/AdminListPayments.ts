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
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Items per page. Server caps at 50. Defaults to 25. */
  pageSize?: number;
}

export type AdminListPaymentsError =
  | OrderError
  | { kind: "user_error"; message: string };

export type AdminListPaymentsResult = Result<
  { orders: readonly Order[]; users: ReadonlyMap<string, User>; total: number; page: number; pageSize: number },
  AdminListPaymentsError
>;

export interface AdminListPaymentsDeps {
  orderRepo: IOrderRepository;
  userRepo: UserRepository;
}

export class AdminListPayments {
  constructor(private readonly deps: AdminListPaymentsDeps) {}

  async execute(input: AdminListPaymentsInput): Promise<AdminListPaymentsResult> {
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const pageSize = Math.min(Math.max(1, Math.floor(input.pageSize ?? 25)), 50);

    const listResult = await this.deps.orderRepo.listPaginated({
      status: input.status,
      page,
      pageSize,
    });
    if (!listResult.ok) {
      return Result.err(listResult.error);
    }

    const { orders, total } = listResult.value;

    // For email search, we need the full user list to filter by email.
    // With pagination we can't search across all pages in-app; for now we load
    // all matching user IDs (email search typically has low cardinality) and
    // filter the current page against them. This is a pragmatic middle ground
    // that avoids O(all-orders) in the common case.
    const search = input.userEmailSearch?.toLowerCase().trim();
    let filtered = orders;
    let users = new Map<string, User>();

    if (search) {
      // Fetch the full user set matching the status filter (not paginated)
      // so we can intersect against all possible users for the email search.
      // This is acceptable because the user table is bounded and email search
      // is an admin-only affordance, not a high-frequency operation.
      const allResult = await this.deps.orderRepo.listAll({ status: input.status });
      if (!allResult.ok) {
        return Result.err({ kind: "user_error", message: String(allResult.error.kind) });
      }
      const allUserIds = new Set(allResult.value.map((o) => o.userId));
      const matchedUserIds = new Set<string>();
      for (const userId of allUserIds) {
        const r = await this.deps.userRepo.findById(userId);
        if (!r.ok) {
          return Result.err({ kind: "user_error", message: String(r.error.kind) });
        }
        if (r.value.email.toLowerCase().includes(search)) {
          matchedUserIds.add(userId);
          users.set(userId, r.value);
        }
      }
      filtered = orders.filter((o) => matchedUserIds.has(o.userId));
    }

    return Result.ok({ orders: filtered, users, total, page, pageSize });
  }
}
