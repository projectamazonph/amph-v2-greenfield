import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Result } from "@/domain/shared/Result";
import { PaymentFailedTemplateRenderer } from "@/infra/email/templates/PaymentFailedRenderer";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import type { EmailSender } from "@/ports/email/EmailSender";
import { NotifyPaymentFailure } from "@/usecases/NotifyPaymentFailure";

class RecordingEmailSender implements EmailSender {
  readonly sent: Array<Parameters<EmailSender["send"]>[0]> = [];

  async send(args: Parameters<EmailSender["send"]>[0]) {
    this.sent.push(args);
    return Result.ok({ messageId: "message_1" });
  }
}

async function createUseCase() {
  const orderRepo = new InMemoryOrderRepository();
  const userRepo = new InMemoryUserRepository();
  const courseRepo = new InMemoryCourseRepository();
  const emailSender = new RecordingEmailSender();

  await orderRepo.seedPendingOrder({
    id: "order_1",
    userId: "user_1",
    courseId: "course_1",
    paymongoPaymentId: "cs_1",
    paymongoCheckoutUrl: "https://checkout.example.test/cs_1",
  });
  await userRepo.create({
    id: "user_1",
    email: "maria@example.test",
    passwordHash: "hash",
    firstName: "Maria",
    lastName: "Santos",
  });
  courseRepo.seed([
    {
      id: "course_1",
      slug: "ppc-foundations",
      title: "PPC Foundations",
      tagline: "",
      description: "",
      price: { minor: 199900, currency: "PHP" },
      curriculum: { sections: [] },
      coverImage: null,
      isFeatured: false,
      displayOrder: 0,
      status: "PUBLISHED",
      courseTier: "STARTER",
      previewLessonCount: 0,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      moduleIds: [],
    } as never,
  ]);

  return {
    emailSender,
    orderRepo,
    useCase: new NotifyPaymentFailure({
      orderRepo,
      userRepo,
      courseRepo,
      emailSender,
      paymentFailedEmailRenderer: new PaymentFailedTemplateRenderer(),
    }),
  };
}

describe("NotifyPaymentFailure", () => {
  it("marks the buyer's pending order as failed and sends a retry email", async () => {
    const { emailSender, orderRepo, useCase } = await createUseCase();

    const result = await useCase.execute({ orderId: "order_1", userId: "user_1" });

    expect(result).toEqual({ ok: true, value: { sent: true } });
    const updated = await orderRepo.findById("order_1");
    if (!updated.ok) throw new Error("order not found");
    expect(updated.value.status).toBe("FAILED");
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.to).toBe("maria@example.test");
    expect(emailSender.sent[0]?.subject).toContain("PPC Foundations");
    const html = renderToStaticMarkup(emailSender.sent[0]!.react);
    expect(html).toContain("Try again");
    expect(html).toContain("courseSlug=ppc-foundations");
  });

  it("does not send another email after an already handled failure", async () => {
    const { emailSender, useCase } = await createUseCase();

    await useCase.execute({ orderId: "order_1", userId: "user_1" });
    const duplicate = await useCase.execute({ orderId: "order_1", userId: "user_1" });

    expect(duplicate).toEqual({ ok: true, value: { sent: false } });
    expect(emailSender.sent).toHaveLength(1);
  });

  it("does not let another user change an order or receive its email", async () => {
    const { emailSender, orderRepo, useCase } = await createUseCase();

    const result = await useCase.execute({ orderId: "order_1", userId: "user_2" });

    expect(result).toEqual({ ok: false, error: { kind: "order_not_found" } });
    const unchanged = await orderRepo.findById("order_1");
    if (!unchanged.ok) throw new Error("order not found");
    expect(unchanged.value.status).toBe("PENDING");
    expect(emailSender.sent).toHaveLength(0);
  });
});
