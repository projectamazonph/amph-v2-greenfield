import { buildAppUrl } from "@/domain/shared/AppUrl";
import { Result } from "@/domain/shared/Result";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { PaymentFailedRenderer } from "@/ports/email/PaymentFailedRenderer";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type NotifyPaymentFailureError =
  { kind: "order_not_found" } | { kind: "lookup_failed" } | { kind: "order_update_failed" };

export interface NotifyPaymentFailureDeps {
  readonly orderRepo: IOrderRepository;
  readonly userRepo: UserRepository;
  readonly courseRepo: CourseRepository;
  readonly emailSender: EmailSender;
  readonly paymentFailedEmailRenderer: PaymentFailedRenderer;
}

/**
 * Finalize a failed hosted-checkout return for its authenticated buyer.
 *
 * PayMongo's failed return URL carries the local order id. The user identity
 * is supplied by the server action, never by the browser. Moving the pending
 * order to FAILED makes repeated returns idempotent and gives the retry CTA a
 * fresh checkout session rather than reusing an abandoned one.
 */
export class NotifyPaymentFailure {
  constructor(private readonly deps: NotifyPaymentFailureDeps) {}

  async execute(
    input: Readonly<{ orderId: string; userId: string }>,
  ): Promise<Result<{ sent: boolean }, NotifyPaymentFailureError>> {
    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      return Result.err(
        orderResult.error.kind === "not_found"
          ? { kind: "order_not_found" }
          : { kind: "lookup_failed" },
      );
    }

    const order = orderResult.value;
    if (order.userId !== input.userId) return Result.err({ kind: "order_not_found" });
    if (order.status !== "PENDING") return Result.ok({ sent: false });

    const [userResult, courseResult] = await Promise.all([
      this.deps.userRepo.findById(order.userId),
      this.deps.courseRepo.findById(order.courseId),
    ]);
    if (!userResult.ok || !courseResult.ok) return Result.err({ kind: "lookup_failed" });

    const markedFailed = order.markFailed();
    if (!markedFailed.ok) return Result.ok({ sent: false });
    const updateResult = await this.deps.orderRepo.update(order);
    if (!updateResult.ok) return Result.err({ kind: "order_update_failed" });

    const retryUrl = buildAppUrl(
      `/checkout?courseSlug=${encodeURIComponent(courseResult.value.slug)}`,
    );
    await this.deps.emailSender.send({
      to: userResult.value.email,
      subject: `Payment not completed: ${courseResult.value.title}`,
      react: this.deps.paymentFailedEmailRenderer.render({
        firstName: userResult.value.firstName,
        courseTitle: courseResult.value.title,
        retryUrl,
      }),
    });

    return Result.ok({ sent: true });
  }
}
