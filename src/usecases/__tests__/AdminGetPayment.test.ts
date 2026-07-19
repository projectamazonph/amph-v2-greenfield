/**
 * AdminGetPayment.test.ts — STORY-049.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetPayment } from "@/usecases/AdminGetPayment";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { Order } from "@/domain/entities/Order";
import { createCourse, type Course } from "@/domain/entities/Course";

async function seedOrder(repo: InMemoryOrderRepository, params: {
  id: string;
  userId: string;
  courseId: string;
  totalMinor?: number;
}): Promise<Order> {
  await repo.seedPaidOrder({
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    totalMinor: params.totalMinor ?? 299900,
  });
  const r = await repo.findById(params.id);
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

function makeCourse(overrides: Partial<{ id: string; slug: string; title: string }> = {}): Course {
  const r = createCourse({
    id: "c1",
    slug: "test-course",
    title: "Test Course",
    tagline: "A test course",
    description: "Test description",
    priceMinor: 299900,
    curriculum: {
      sections: [
        {
          id: "s1",
          title: "Section 1",
          lessons: [
            { id: "l1", title: "Lesson 1", type: "TEXT", content: { body: "hi" } as never },
          ],
        },
      ],
    },
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("AdminGetPayment", () => {
  let orderRepo: InMemoryOrderRepository;
  let userRepo: InMemoryUserRepository;
  let courseRepo: InMemoryCourseRepository;
  let useCase: AdminGetPayment;

  beforeEach(async () => {
    orderRepo = new InMemoryOrderRepository();
    userRepo = new InMemoryUserRepository();
    courseRepo = new InMemoryCourseRepository();
    await userRepo.create({
      id: "u1",
      email: "test@example.com",
      passwordHash: "hash",
      firstName: "Test",
      lastName: "User",
    });
    await courseRepo.create(makeCourse());
    useCase = new AdminGetPayment({ orderRepo, userRepo, courseRepo });
  });

  it("returns the order + user + course on the happy path", async () => {
    await seedOrder(orderRepo, { id: "o1", userId: "u1", courseId: "c1" });

    const r = await useCase.execute({ orderId: "o1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.id).toBe("o1");
    expect(r.value.user.email).toBe("test@example.com");
    expect(r.value.course.title).toBe("Test Course");
  });

  it("returns order_not_found when the order doesn't exist", async () => {
    const r = await useCase.execute({ orderId: "missing" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("order_not_found");
  });

  it("returns user_not_found when the user no longer exists", async () => {
    await seedOrder(orderRepo, { id: "o1", userId: "u_missing", courseId: "c1" });
    const r = await useCase.execute({ orderId: "o1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_not_found");
  });

  it("returns course_not_found when the course no longer exists", async () => {
    await seedOrder(orderRepo, { id: "o1", userId: "u1", courseId: "c_missing" });
    const r = await useCase.execute({ orderId: "o1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_not_found");
  });
});
