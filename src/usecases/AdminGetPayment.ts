/**
 * AdminGetPayment — fetch one order with the user + course data.
 *
 * STORY-049. Joins Order + User + Course for the admin detail page.
 */

import { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";

export interface AdminGetPaymentInput {
  orderId: string;
}

export type AdminGetPaymentError =
  | { kind: "order_not_found" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | OrderError
  | { kind: "user_error"; message: string }
  | { kind: "course_error"; message: string };

export type AdminGetPaymentResult = Result<
  { order: Order; user: User; course: Course },
  AdminGetPaymentError
>;

export interface AdminGetPaymentDeps {
  orderRepo: IOrderRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
}

export class AdminGetPayment {
  constructor(private readonly deps: AdminGetPaymentDeps) {}

  async execute(input: AdminGetPaymentInput): Promise<AdminGetPaymentResult> {
    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return Result.err(orderResult.error);
    }

    const userResult = await this.deps.userRepo.findById(orderResult.value.userId);
    if (!userResult.ok) {
      if (userResult.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      return Result.err({ kind: "user_error", message: String(userResult.error.kind) });
    }

    const courseResult = await this.deps.courseRepo.findById(orderResult.value.courseId);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      return Result.err({ kind: "course_error", message: String(courseResult.error.kind) });
    }

    return Result.ok({
      order: orderResult.value,
      user: userResult.value,
      course: courseResult.value,
    });
  }
}
