import { describe, it, expect, beforeEach } from "vitest";
import { CreatePaymentIntent } from "@/usecases/CreatePaymentIntent";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { createCourse } from "@/domain/entities/Course";
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";

function makeCourse(overrides: Partial<Parameters<typeof createCourse>[0]> = {}): Course {
  const r = createCourse({
    id: "c0",
    slug: "amazon-ppc-mastery",
    title: "Amazon PPC Mastery",
    tagline: "Learn PPC.",
    description: "A course.",
    priceMinor: 299900,
    currency: "PHP",
    curriculum: {
      sections: [{
        id: "s1", title: "Intro",
        lessons: [{ id: "l1", title: "Welcome", type: "VIDEO" as const, content: { durationMinutes: 5 } }],
      }],
    },
    status: "PUBLISHED",
    displayOrder: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  } as Parameters<typeof createCourse>[0]);
  if (Result.isErr(r)) throw new Error("bad fixture: " + JSON.stringify(r.error));
  return r.value;
}

describe("CreatePaymentIntent", () => {
  let courseRepo: InMemoryCourseRepository;
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;
  let useCase: CreatePaymentIntent;

  const BASE_URL = "https://amph.example.com";
  const USER_ID = "user_01";
  const COURSE_SLUG = "amazon-ppc-mastery";

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
    useCase = new CreatePaymentIntent({
      courseRepo,
      orderRepo,
      paymentGateway,
      baseUrl: BASE_URL,
    });
  });

  // ── happy path ─────────────────────────────────────────────

  it("creates an order and returns the PayMongo checkout URL", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkoutUrl).toBe("https://checkout.paymongo.com/cs_test_123");
    expect(result.orderId).toBeDefined();
  });

  it("creates an order in PENDING status", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    const orders = orderRepo.getAll();
    expect(orders).toHaveLength(1);
    expect(orders[0]!.status).toBe("PENDING");
  });

  it("sets correct order amounts from course", async () => {
    const course = makeCourse({
      id: "course_01",
      slug: COURSE_SLUG,
      priceMinor: 499900,
      currency: "PHP",
    });
    courseRepo.seed([course]);

    await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    const order = orderRepo.getAll()[0]!;
    expect(order.totalMinor).toBe(499900);
    expect(order.currency).toBe("PHP");
  });

  it("passes correct metadata to PayMongo", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    const call = paymentGateway.calls[0]!;
    expect(call.params.metadata.orderId).toBeDefined();
    expect(call.params.metadata.userId).toBe(USER_ID);
    expect(call.params.metadata.courseId).toBe("course_01");
  });

  it("sets success and failed redirect URLs", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    const call = paymentGateway.calls[0]!;
    expect(call.params.successUrl).toContain(`${BASE_URL}/checkout/success`);
    expect(call.params.failedUrl).toContain(`${BASE_URL}/checkout/failed`);
  });

  // ── error cases ────────────────────────────────────────────

  it("returns course_not_found when course does not exist", async () => {
    const result = await useCase.execute({ userId: USER_ID, courseSlug: "nonexistent-slug" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_found");
  });

  it("returns course_not_published when course is DRAFT", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG, status: "DRAFT" });
    courseRepo.seed([course]);

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_published");
  });

  it("returns already_enrolled when user already has a PAID order for this course", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    // Seed a pre-existing PAID order for this user + course
    await orderRepo.seedPaidOrder({
      id: "existing_order",
      userId: USER_ID,
      courseId: "course_01",
      totalMinor: 299900,
    });

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_enrolled");
  });

  it("allows re-trying when user has a FAILED order for the same course", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    // Seed a FAILED order — user should be able to try again
    await orderRepo.seedFailedOrder({
      id: "failed_order",
      userId: USER_ID,
      courseId: "course_01",
    });

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });
    expect(result.ok).toBe(true);
  });

  it("allows re-trying when user has an EXPIRED order for the same course", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    await orderRepo.seedExpiredOrder({
      id: "expired_order",
      userId: USER_ID,
      courseId: "course_01",
    });

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });
    expect(result.ok).toBe(true);
  });

  it("returns payment_error when PayMongo API fails", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    paymentGateway.shouldFail = true;
    paymentGateway.failureReason = { kind: "paymongo_error", code: "server_error", message: "PayMongo is down" };

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("payment_error");
    const paymentErr = result.error as { kind: "payment_error"; message: string };
    expect(paymentErr.message).toBe("PayMongo is down");
  });

  it("returns payment_error on network failure", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    paymentGateway.shouldFail = true;
    paymentGateway.failureReason = { kind: "network_error", message: "Connection refused" };

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("payment_error");
  });

  // ── idempotency ───────────────────────────────────────────

  it("if order already has a pending checkout, reuses the existing checkout URL", async () => {
    const course = makeCourse({ id: "course_01", slug: COURSE_SLUG });
    courseRepo.seed([course]);

    // Seed a PENDING order with an existing checkout URL
    await orderRepo.seedPendingOrder({
      id: "pending_order",
      userId: USER_ID,
      courseId: "course_01",
      paymongoPaymentId: "cs_existing",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_existing",
    });

    const result = await useCase.execute({ userId: USER_ID, courseSlug: COURSE_SLUG });

    // Should return the existing URL without calling PayMongo again
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checkoutUrl).toBe("https://checkout.paymongo.com/cs_existing");
    expect(paymentGateway.calls).toHaveLength(0); // no new PayMongo call
  });
});
