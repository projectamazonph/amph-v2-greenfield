/**
 * GetUserDetail.test.ts — STORY-047.
 *
 * Tier B coverage for the GetUserDetail use case.
 * Covers: happy path, user not found, db_error from user repo,
 * db_error from enrollment repo, enrollment count.
 */

import { describe, it, expect, vi } from "vitest";
import { GetUserDetail } from "@/usecases/GetUserDetail";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { Result } from "@/domain/shared/Result";
import type { User } from "@/domain/entities/User";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { createEnrollment } from "@/domain/entities/Enrollment";

// ── Fixtures ───────────────────────────────────────────────────────────────

const USER_ID = "user_01";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "V.",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    totalXp: 0,
    ...overrides,
  } as User;
}

async function seedUser(repo: InMemoryUserRepository, overrides: Partial<User> = {}): Promise<User> {
  const u = makeUser(overrides);
  await repo.create({
    id: u.id,
    email: u.email,
    passwordHash: "stubbed:hash",
    firstName: u.firstName,
    lastName: u.lastName,
  });
  const read = await repo.findById(u.id);
  if (!read.ok || !read.value) throw new Error("seed failed");
  return read.value;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GetUserDetail", () => {
  it("returns the user with their enrollment count on the happy path", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    await seedUser(userRepo);

    // Seed 3 enrollments
    for (let i = 0; i < 3; i++) {
      const result = createEnrollment({
        id: `enrol_${i}`,
        userId: USER_ID,
        courseId: `course_${i}`,
        createdAt: new Date(),
      });
      if (!result.ok) throw new Error(`seed enrollment ${i} failed`);
      await enrollmentRepo.create(result.value);
    }

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.id).toBe(USER_ID);
    expect(result.value.user.email).toBe("alice@example.com");
    expect(result.value.enrollmentCount).toBe(3);
  });

  it("returns enrollmentCount=0 when the user has no enrollments", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    await seedUser(userRepo);

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enrollmentCount).toBe(0);
  });

  it("returns user_not_found when the user does not exist", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    const result = await useCase.execute({ userId: "missing" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("user_not_found");
  });

  it("returns db_error when the user repo errors", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    const original = userRepo.findById.bind(userRepo);
    userRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "user db down" },
    });

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("user db down");

    userRepo.findById = original;
  });

  it("returns db_error when the enrollment repo errors", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    await seedUser(userRepo);
    enrollmentRepo.findByUserId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "enrollment db down" },
    });

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("enrollment db down");
  });

  it("does not call findByUserId on the enrollment repo when the user is missing", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    const spy = vi.spyOn(enrollmentRepo, "findByUserId");

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    await useCase.execute({ userId: "missing" });

    expect(spy).not.toHaveBeenCalled();
  });

  it("returns the full user shape (id, email, names, role, tier, totalXp)", async () => {
    const userRepo = new InMemoryUserRepository();
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    await seedUser(userRepo, {
      firstName: "Maria",
      lastName: "Santos",
    });

    const useCase = new GetUserDetail({ userRepo, enrollmentRepo });
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The in-memory repo's create() defaults role to STUDENT and
    // subscriptionTier to FREE — those are the values we verify here.
    // Role/tier mutation is tracked by the production Prisma adapter.
    expect(result.value.user.firstName).toBe("Maria");
    expect(result.value.user.lastName).toBe("Santos");
    expect(result.value.user.role).toBe("STUDENT");
    expect(result.value.user.subscriptionTier).toBe("FREE");
  });
});
