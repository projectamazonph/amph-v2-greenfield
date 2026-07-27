import { describe, it, expect, beforeEach } from "vitest";
import { AdminUpdateQuiz } from "../AdminUpdateQuiz";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { Result } from "@/domain/shared/Result";
import { createQuiz, type Quiz } from "@/domain/entities/Quiz";

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2025-01-01T00:00:00Z")),
  });
}

function makeQuiz(id: string, courseId: string): Quiz {
  const r = createQuiz({
    id,
    courseId,
    title: "Original",
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

describe("AdminUpdateQuiz", () => {
  let quizRepo: InMemoryQuizRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminUpdateQuiz;

  beforeEach(async () => {
    quizRepo = new InMemoryQuizRepository();
    audit = new InMemoryAuditLog();
    useCase = new AdminUpdateQuiz({ quizRepo, recordAuditLog: makeRecordAuditLog(audit) });
    await quizRepo.create(makeQuiz("q1", "c1"));
  });

  it("updates an existing quiz", async () => {
    const r = await useCase.execute({
      id: "q1",
      courseId: "c1",
      title: "Updated",
      passingScore: 80,
      questions: [
        {
          id: "q1_q1",
          questionText: "New Q?",
          options: [
            { id: "o1", optionText: "A", isCorrect: true },
            { id: "o2", optionText: "B", isCorrect: false },
          ],
        },
      ],
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quiz.title).toBe("Updated");
    expect(r.value.quiz.passingScore).toBe(80);
    expect(r.value.quiz.questions[0]?.questionText).toBe("New Q?");
  });

  it("writes audit log on success", async () => {
    await useCase.execute({
      id: "q1",
      courseId: "c1",
      title: "x",
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
    });
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.updated")).toBe(true);
  });

  it("returns not_found when the quiz doesn't exist and audits", async () => {
    quizRepo.update = async () => Result.err({ kind: "not_found" });
    const r = await useCase.execute({
      id: "missing",
      courseId: "c1",
      title: "x",
      passingScore: 70,
      questions: [
        {
          id: "q",
          questionText: "Q?",
          options: [
            { id: "o1", optionText: "A", isCorrect: true },
            { id: "o2", optionText: "B", isCorrect: false },
          ],
        },
      ],
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "quiz.update_failed")).toBe(true);
  });

  it("rejects with invalid_passing_score and audits", async () => {
    const r = await useCase.execute({
      id: "q1",
      courseId: "c1",
      title: "x",
      passingScore: -1,
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
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_passing_score");
  });

  it("returns db_error on repository failure and audits", async () => {
    quizRepo.update = async () => Result.err({ kind: "db_error", message: "down" });
    const r = await useCase.execute({
      id: "q1",
      courseId: "c1",
      title: "x",
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
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
