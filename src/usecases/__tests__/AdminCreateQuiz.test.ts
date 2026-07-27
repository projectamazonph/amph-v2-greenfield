import { describe, it, expect, beforeEach } from "vitest";
import { AdminCreateQuiz } from "../AdminCreateQuiz";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { Result } from "@/domain/shared/Result";

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2025-01-01T00:00:00Z")),
  });
}

const validInput = {
  id: "q1",
  courseId: "c1",
  title: "Quiz 1",
  passingScore: 70,
  questions: [
    {
      id: "q1_q1",
      questionText: "Q?",
      options: [
        { id: "o1", optionText: "A", isCorrect: true },
        { id: "o2", optionText: "B", isCorrect: false },
      ],
    },
  ],
  actorId: "admin_1",
};

describe("AdminCreateQuiz", () => {
  let quizRepo: InMemoryQuizRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminCreateQuiz;

  beforeEach(() => {
    quizRepo = new InMemoryQuizRepository();
    audit = new InMemoryAuditLog();
    useCase = new AdminCreateQuiz({ quizRepo, recordAuditLog: makeRecordAuditLog(audit) });
  });

  it("creates a quiz with valid input", async () => {
    const r = await useCase.execute(validInput);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quiz.id).toBe("q1");
    expect(r.value.quiz.questions).toHaveLength(1);
  });

  it("writes audit log on success", async () => {
    await useCase.execute(validInput);
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.created" && l.targetId === "q1")).toBe(true);
  });

  it("rejects with invalid_passing_score and audits", async () => {
    const r = await useCase.execute({ ...validInput, passingScore: 150 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_passing_score");
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.create_failed")).toBe(true);
  });

  it("rejects when a question has no correct option and audits", async () => {
    const r = await useCase.execute({
      ...validInput,
      questions: [
        {
          id: "q1",
          questionText: "Q?",
          options: [
            { id: "o1", optionText: "A", isCorrect: false },
            { id: "o2", optionText: "B", isCorrect: false },
          ],
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("question_missing_correct_option");
  });

  it("rejects when a question has multiple correct options and audits", async () => {
    const r = await useCase.execute({
      ...validInput,
      questions: [
        {
          id: "q1",
          questionText: "Q?",
          options: [
            { id: "o1", optionText: "A", isCorrect: true },
            { id: "o2", optionText: "B", isCorrect: true },
          ],
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("question_multiple_correct_options");
  });

  it("rejects when there are no questions and audits", async () => {
    const r = await useCase.execute({ ...validInput, questions: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("no_questions");
  });

  it("returns db_error on repository failure and audits", async () => {
    quizRepo.create = async () => Result.err({ kind: "db_error", message: "down" });
    const r = await useCase.execute(validInput);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.create_failed")).toBe(true);
  });
});
