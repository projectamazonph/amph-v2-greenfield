/**
 * ListRefundRequests — admin list view of refund requests.
 *
 * STORY-062. Pure pass-through to the repo, plus a user-info join so
 * the admin UI can render the student's email without an N+1 round-trip.
 *
 * Filters:
 *  - `status`: "pending" | "processed" (optional)
 *  - `userEmailSearch`: case-insensitive substring on user.email (optional)
 *  - `cursor`: cursor pagination token from a previous page (optional)
 *  - `limit`: max rows per page (default 50, capped at 100 by the repo)
 *
 * The repo returns raw orders; this use case enriches each order with
 * its associated user and exposes both via a `users` Map. The
 * `total` returned is the total BEFORE the user-email filter is
 * applied — this matches the audit-log pattern where the page itself
 * reports "X refund requests total" before the search narrows it.
 */

import { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { User } from "@/domain/entities/User";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface ListRefundRequestsInput {
  status?: "pending" | "processed";
  userEmailSearch?: string;
  cursor?: string;
  limit?: number;
}

export type ListRefundRequestsError = OrderError | { kind: "user_error"; message: string };

export type ListRefundRequestsResult = Result<
  {
    orders: readonly Order[];
    users: ReadonlyMap<string, User>;
    nextCursor: string | null;
    total: number;
  },
  ListRefundRequestsError
>;

export interface ListRefundRequestsDeps {
  orderRepo: IOrderRepository;
  userRepo: UserRepository;
}

export class ListRefundRequests {
  constructor(private readonly deps: ListRefundRequestsDeps) {}

  async execute(input: ListRefundRequestsInput): Promise<ListRefundRequestsResult> {
    const listResult = await this.deps.orderRepo.listRefundRequests({
      status: input.status,
      cursor: input.cursor,
      limit: input.limit,
    });
    if (!listResult.ok) {
      return Result.err(listResult.error);
    }

    const { orders } = listResult.value;
    const search = input.userEmailSearch?.toLowerCase().trim();

    // No email search → return as-is, empty user map.
    if (!search) {
      return Result.ok({
        orders,
        users: new Map(),
        nextCursor: listResult.value.nextCursor,
        total: listResult.value.total,
      });
    }

    // Resolve each order's user once, then filter.
    const userIds = Array.from(new Set(orders.map((o) => o.userId)));
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
    const filtered = orders.filter((o) => users.has(o.userId));

    return Result.ok({
      orders: filtered,
      users,
      nextCursor: listResult.value.nextCursor,
      total: listResult.value.total,
    });
  }
}
