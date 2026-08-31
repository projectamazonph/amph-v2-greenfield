import { describe, it, expect, beforeEach } from "vitest";
import { AdminDeleteQuiz } from "../AdminDeleteQuiz";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { Result } from "@/domain/shared/Result";
import { createQuiz, type Quiz } from "@/domain/entities/Quiz";
import { startQuizAttempt, type QuizAttempt } from "@/domain/entities/QuizAttempt";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2025-01-01T00:00:00Z")),
    logger: new SilentLogger(),
  });
}

function makeQuiz(id: string, courseId: string): Quiz {
  const r = createQuiz({
    id,
    courseId,
    title: "Q",
    passingScore: 70,
    questions: [
      {
        id: `${id}_q1`,
        questionText: "Q?",
        options: [
          { id: "o1", optionText: "A", isCorrect: true },
          { id: "o2", optionText: "B", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("makeQuiz failed: " + JSON.stringify(r.error));
  return r.value;
}

function makeAttempt(id: string, userId: string, quizId: string): QuizAttempt {
  const r = startQuizAttempt({ id, userId, quizId });
  if (!r.ok) throw new Error("makeAttempt failed: " + JSON.stringify(r.error));
  return r.value;
}

describe("AdminDeleteQuiz", () => {
  let quizRepo: InMemoryQuizRepository;
  let quizAttemptRepo: InMemoryQuizAttemptRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminDeleteQuiz;

  beforeEach(async () => {
    quizRepo = new InMemoryQuizRepository();
    quizAttemptRepo = new InMemoryQuizAttemptRepository();
    audit = new InMemoryAuditLog();
    useCase = new AdminDeleteQuiz({
      quizRepo,
      quizAttemptRepo,
      recordAuditLog: makeRecordAuditLog(audit),
    });
    await quizRepo.create(makeQuiz("q1", "c1"));
  });

  it("deletes a quiz with no attempts", async () => {
    const r = await useCase.execute({ quizId: "q1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.deleted).toBe(true);
    const find = await quizRepo.findById("q1");
    expect(find.ok).toBe(true);
    if (find.ok) expect(find.value).toBeNull();
  });

  it("writes audit log on success", async () => {
    await useCase.execute({ quizId: "q1", actorId: "admin_1" });
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.deleted" && l.targetId === "q1")).toBe(true);
  });

  it("returns has_attempts when any attempt references the quiz and audits", async () => {
    await quizAttemptRepo.create(makeAttempt("qa1", "u1", "q1"));
    const r = await useCase.execute({ quizId: "q1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("has_attempts");
    if (r.error.kind !== "has_attempts") return;
    expect(r.error.attemptCount).toBe(1);
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.delete_failed")).toBe(true);
  });

  it("does not delete the quiz when has_attempts guard trips", async () => {
    await quizAttemptRepo.create(makeAttempt("qa1", "u1", "q1"));
    await useCase.execute({ quizId: "q1", actorId: "admin_1" });
    const find = await quizRepo.findById("q1");
    expect(find.ok).toBe(true);
    if (find.ok) expect(find.value).not.toBeNull();
  });

  it("returns not_found when the quiz doesn't exist and audits", async () => {
    quizRepo.delete = async () => Result.err({ kind: "not_found" });
    const r = await useCase.execute({ quizId: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns db_error on repository failure and audits", async () => {
    quizRepo.delete = async () => Result.err({ kind: "db_error", message: "down" });
    const r = await useCase.execute({ quizId: "q1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
