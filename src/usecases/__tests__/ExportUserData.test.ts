import { describe, it, expect, beforeEach } from "vitest";
import { ExportUserData } from "../ExportUserData";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { InMemoryBadgeAwardRepository } from "@/infra/repositories/InMemoryBadgeAwardRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { InMemoryProgressEventRepository } from "@/infra/repositories/InMemoryProgressEventRepository";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";

function buildUseCase(overrides: { userRepo?: InMemoryUserRepository } = {}) {
  return new ExportUserData({
    userRepo: overrides.userRepo ?? new InMemoryUserRepository(),
    orderRepo: new InMemoryOrderRepository(),
    enrollmentRepo: new InMemoryEnrollmentRepository(),
    certificateRepo: new InMemoryCertificateRepository(),
    badgeAwardRepo: new InMemoryBadgeAwardRepository(),
    xpEventRepo: new InMemoryXPEventRepository(),
    progressEventRepo: new InMemoryProgressEventRepository(),
    quizAttemptRepo: new InMemoryQuizAttemptRepository(),
    simulatorAttemptRepo: new InMemorySimulatorAttemptRepository(),
    clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
  });
}

describe("ExportUserData", () => {
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
  });

  it("returns user_not_found for a nonexistent user", async () => {
    const useCase = buildUseCase({ userRepo });
    const r = await useCase.execute({ userId: "ghost" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_not_found");
  });

  it("returns the profile and empty collections for a user with no records", async () => {
    await userRepo.create({
      id: "student_1",
      email: "student@example.com",
      passwordHash: "x",
      firstName: "Jane",
      lastName: "Doe",
    });

    const useCase = buildUseCase({ userRepo });
    const r = await useCase.execute({ userId: "student_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.profile.email).toBe("student@example.com");
    expect(r.value.orders).toEqual([]);
    expect(r.value.enrollments).toEqual([]);
    expect(r.value.certificates).toEqual([]);
    expect(r.value.badgeAwards).toEqual([]);
    expect(r.value.xpEvents).toEqual([]);
    expect(r.value.progressEvents).toEqual([]);
    expect(r.value.quizAttempts).toEqual([]);
    expect(r.value.simulatorAttempts).toEqual([]);
    expect(r.value.exportedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(r.value.notes).toEqual([]);
    expect(JSON.parse(JSON.stringify(r.value))).toEqual(r.value);
  });
});
