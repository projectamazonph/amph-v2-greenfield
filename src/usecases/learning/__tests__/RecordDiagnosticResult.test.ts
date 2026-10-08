import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";
import { RecordDiagnosticResult } from "../RecordDiagnosticResult";
import { FixedClock } from "@/ports/system/Clock";

describe("RecordDiagnosticResult", () => {
  it("persists the diagnostic result on the user row and emits the structured analytics log event", async () => {
    const container = buildTestContainer();
    const { userRepo, logger, recordDiagnosticResult } = container;

    // Seed a user
    const createUserRes = await userRepo.create({
      id: "user_diag_01",
      email: "diag_student@example.com",
      passwordHash: "hash123",
      firstName: "Diagnostic",
      lastName: "Student",
    });
    expect(createUserRes.ok).toBe(true);

    const fixedDate = new Date("2026-09-15T12:00:00.000Z");
    const result = await recordDiagnosticResult.execute({
      userId: "user_diag_01",
      outcome: "experienced",
      completedAt: fixedDate,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome).toBe("experienced");
      expect(result.value.completedAt).toEqual(fixedDate);
    }

    // Verify persisted result in userRepo
    const latestRes = await userRepo.getLatestDiagnostic("user_diag_01");
    expect(latestRes.ok).toBe(true);
    if (latestRes.ok && latestRes.value) {
      expect(latestRes.value.outcome).toBe("experienced");
      expect(latestRes.value.completedAt).toEqual(fixedDate);
    }

    // Verify structured log event in TestLogger
    const logEntry = logger.entries.find(
      (e) => e.message === "learning_event:diagnostic_completed",
    );
    expect(logEntry).toBeDefined();
    expect(logEntry?.level).toBe("info");
    expect(logEntry?.context).toEqual({
      userId: "user_diag_01",
      outcome: "experienced",
    });
  });

  it("returns error when user does not exist", async () => {
    const container = buildTestContainer();
    const { recordDiagnosticResult } = container;

    const result = await recordDiagnosticResult.execute({
      userId: "user_nonexistent",
      outcome: "new",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("not_found");
    }
  });

  it("uses the injected clock when completedAt is omitted", async () => {
    const container = buildTestContainer();
    const fixedTime = new Date("2026-10-01T08:30:00.000Z");
    const clock = new FixedClock(fixedTime);
    const usecase = new RecordDiagnosticResult({
      userRepo: container.userRepo,
      logger: container.logger,
      clock,
    });

    await container.userRepo.create({
      id: "user_diag_02",
      email: "diag_student2@example.com",
      passwordHash: "hash123",
      firstName: "Student",
      lastName: "Two",
    });

    const result = await usecase.execute({
      userId: "user_diag_02",
      outcome: "familiar",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.completedAt).toEqual(fixedTime);
    }
  });
});
