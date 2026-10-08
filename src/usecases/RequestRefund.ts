import type { Order } from "@/domain/entities/Order";
import { Result } from "@/domain/shared/Result";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { Clock } from "@/ports/system/Clock";

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type RequestRefundError =
  | { kind: "order_not_found" }
  | { kind: "order_not_paid" }
  | { kind: "refund_window_expired" }
  | { kind: "completion_limit_reached"; progressPercent: number }
  | { kind: "invalid_reason" }
  | { kind: "db_error"; message: string };

export interface RequestRefundDeps {
  orderRepo: IOrderRepository;
  enrollmentRepo: IEnrollmentRepository;
  clock: Clock;
}

export class RequestRefund {
  constructor(private readonly deps: RequestRefundDeps) {}

  async execute(input: {
    userId: string;
    orderId: string;
    reason: string;
  }): Promise<Result<Order, RequestRefundError>> {
    const reason = input.reason.trim();
    if (reason.length < 10 || reason.length > 500) {
      return Result.err({ kind: "invalid_reason" });
    }

    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return Result.err(orderResult.error);
    }
    const order = orderResult.value;
    if (order.userId !== input.userId) {
      return Result.err({ kind: "order_not_found" });
    }
    if (order.refundRequestedAt !== null) return Result.ok(order);
    if (order.status !== "PAID" || !order.paymongoPaidAt) {
      return Result.err({ kind: "order_not_paid" });
    }

    const now = this.deps.clock.now();
    if (now.getTime() - order.paymongoPaidAt.getTime() > REFUND_WINDOW_MS) {
      return Result.err({ kind: "refund_window_expired" });
    }

    const enrollment = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      order.courseId,
    );
    const progressPercent = enrollment?.progressPercent ?? 0;
    if (progressPercent >= 25) {
      return Result.err({ kind: "completion_limit_reached", progressPercent });
    }

    const requested = order.requestRefund(reason, now);
    if (!requested.ok) return Result.err({ kind: "order_not_paid" });
    const updateResult = await this.deps.orderRepo.update(order);
    if (!updateResult.ok) {
      return updateResult.error.kind === "not_found"
        ? Result.err({ kind: "order_not_found" })
        : Result.err(updateResult.error);
    }
    return Result.ok(updateResult.value);
  }
}
