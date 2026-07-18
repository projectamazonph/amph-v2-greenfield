/**
 * GetAdminDashboardStats.test.ts — STORY-046.
 *
 * Tests the 6 stat tile values. We instantiate fresh in-memory repos
 * per test (no buildTestContainer singleton), so each test starts from
 * a known empty state.
 */

import { describe, it, expect } from "vitest";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { GetAdminDashboardStats } from "@/usecases/GetAdminDashboardStats";
import { Order } from "@/domain/entities/Order";
import type { Enrollment } from "@/domain/entities/Enrollment";
import type { Certificate } from "@/domain/entities/Certificate";
import type { Course } from "@/domain/entities/Course";
import type { User } from "@/domain/entities/User";

function buildDeps() {
  return {
    userRepo: new InMemoryUserRepository(),
    courseRepo: new InMemoryCourseRepository(),
    orderRepo: new InMemoryOrderRepository(),
    enrollmentRepo: new InMemoryEnrollmentRepository(),
    certificateRepo: new InMemoryCertificateRepository(),
  };
}

function makeUser(id: string, role: User["role"] = "STUDENT"): User {
  return {
    id,
    email: `${id}@test.example.com`,
    firstName: "Test",
    lastName: id,
    role,
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    createdAt: new Date(),
    totalXp: 0,
  };
}

function makeCourse(id: string): Course {
  return {
    id,
    slug: id,
    title: `Course ${id}`,
    tagline: "",
    description: "",
    price: { amountInCentavos: 0, currency: "PHP" },
    curriculum: { sections: [] },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER" as const,
    previewLessonCount: 0,
    createdAt: new Date(),
    moduleIds: [],
  } as unknown as Course;
}

function makePaidOrder(id: string, userId: string, courseId: string, totalMinor: number): Order {
  const order = Order.create({
    id,
    userId,
    courseId,
    subtotalMinor: totalMinor,
    discountMinor: 0,
    totalMinor,
    currency: "PHP",
  });
  order.markPending(`pay_${id}`, "https://example.com/checkout");
  order.markPaid();
  return order;
}

function makeEnrollment(id: string, userId: string, courseId: string): Enrollment {
  return {
    id,
    userId,
    courseId,
    status: "active",
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: new Date(),
    completedLessonIds: [],
    lastLessonId: null,
    progressPercent: 0,
    markLessonComplete: () => undefined,
  };
}

function makeCertificate(
  id: string,
  userId: string,
  courseId: string,
  revoked: boolean,
): Certificate {
  return {
    id,
    userId,
    courseId,
    verificationHash: `hash_${id}`,
    issuedAt: new Date(),
    revokedAt: revoked ? new Date() : null,
    revokedReason: revoked ? "Test revocation" : null,
    status: revoked ? "revoked" : "active",
  };
}

describe("GetAdminDashboardStats", () => {
  it("returns all zeros on an empty system", async () => {
    const deps = buildDeps();
    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      totalStudents: 0,
      totalCourses: 0,
      activeEnrollments: 0,
      totalRevenuePhp: 0,
      certificatesIssued: 0,
      pendingRefunds: 0,
    });
  });

  it("counts students via listAll (filtering by role === STUDENT)", async () => {
    const deps = buildDeps();
    // Insert users via the repo's internal map (the create method only
    // accepts STUDENT role; for admin/instructor we directly set role).
    const u1: User = { ...makeUser("u1", "STUDENT") };
    const u2: User = { ...makeUser("u2", "STUDENT") };
    const u3: User = { ...makeUser("u3", "ADMIN") };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deps.userRepo as any).users.set(u1.id, u1);
    (deps.userRepo as any).users.set(u2.id, u2);
    (deps.userRepo as any).users.set(u3.id, u3);

    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalStudents).toBe(2);
  });

  it("counts courses via listAll", async () => {
    const deps = buildDeps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deps.courseRepo as any).courses.set("c1", makeCourse("c1"));
    (deps.courseRepo as any).courses.set("c2", makeCourse("c2"));
    (deps.courseRepo as any).courses.set("c3", makeCourse("c3"));

    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalCourses).toBe(3);
  });

  it("sums paid order totals into totalRevenuePhp (PHP, not centavos)", async () => {
    const deps = buildDeps();
    const u1 = makeUser("u1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deps.userRepo as any).users.set(u1.id, u1);
    const o1 = makePaidOrder("o1", "u1", "c1", 50000); // ₱500.00
    const o2 = makePaidOrder("o2", "u1", "c1", 12500); // ₱125.00
    await deps.orderRepo.create(o1);
    await deps.orderRepo.create(o2);

    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRevenuePhp).toBe(625);
  });

  it("does not count unpaid orders toward revenue", async () => {
    const deps = buildDeps();
    const u1 = makeUser("u1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deps.userRepo as any).users.set(u1.id, u1);
    // Create an unpaid order (still in PENDING status)
    const order = Order.create({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      subtotalMinor: 50000,
      discountMinor: 0,
      totalMinor: 50000,
      currency: "PHP",
    });
    await deps.orderRepo.create(order);

    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRevenuePhp).toBe(0);
  });

  it("counts only non-revoked certificates in certificatesIssued", async () => {
    const deps = buildDeps();
    const u1 = makeUser("u1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deps.userRepo as any).users.set(u1.id, u1);
    await deps.certificateRepo.create(makeCertificate("cert1", "u1", "c1", false));
    await deps.certificateRepo.create(makeCertificate("cert2", "u1", "c1", true));

    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificatesIssued).toBe(1);
  });

  it("counts active enrollments across all users", async () => {
    const deps = buildDeps();
    const u1 = makeUser("u1");
    const u2 = makeUser("u2");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deps.userRepo as any).users.set(u1.id, u1);
    (deps.userRepo as any).users.set(u2.id, u2);
    await deps.enrollmentRepo.create(makeEnrollment("e1", "u1", "c1"));
    await deps.enrollmentRepo.create(makeEnrollment("e2", "u1", "c2"));
    await deps.enrollmentRepo.create(makeEnrollment("e3", "u2", "c1"));

    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activeEnrollments).toBe(3);
  });

  it("returns 0 for pendingRefunds (RefundRequestRepository not implemented yet)", async () => {
    const deps = buildDeps();
    const uc = new GetAdminDashboardStats(deps);
    const result = await uc.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pendingRefunds).toBe(0);
  });
});
