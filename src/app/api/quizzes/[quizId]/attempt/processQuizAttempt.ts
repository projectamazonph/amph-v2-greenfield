/**
 * processQuizAttempt — pure handler for POST /api/quizzes/[quizId]/attempt.
 *
 * STORY-033: Quiz submission API.
 *
 * Lives outside of route.ts so the business logic can be unit-tested
 * without HTTP. The route handler is a 5-line wrapper that:
 *   1. Reads the session cookie
 *   2. Parses the body
 *   3. Calls processQuizAttempt
 *   4. Maps the result to NextResponse
 *
 * Auth: the caller is responsible for extracting `userId` from the
 * session cookie before calling. We don't trust anything else.
 */

import { z } from "zod";
import { RecordQuizAttempt } from "@/usecases/RecordQuizAttempt";
import type { RecordQuizAttemptError } from "@/usecases/RecordQuizAttempt";
import type { QuizAttempt } from "@/domain/entities/QuizAttempt";
import type { IQuizRepository } from "@/ports/repositories/IQuizRepository";
import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

// ── Request schema ──────────────────────────────────────────────

export const AttemptBodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionId: z.string().min(1),
      }),
    )
    .min(1, "answers must not be empty"),
});

export type AttemptBody = z.infer<typeof AttemptBodySchema>;

// ── Deps (passed in by the route — keeps the function pure) ─────

export interface ProcessQuizAttemptDeps {
  quizRepo: IQuizRepository;
  quizAttemptRepo: IQuizAttemptRepository;
  xpEventRepo: IXPEventRepository;
  userRepo: UserRepository;
  idGen: IdGenerator;
  clock: Clock;
}

// ── Result type ─────────────────────────────────────────────────

export type ProcessQuizAttemptResult =
  | {
      ok: true;
      status: 200;
      value: {
        attempt: QuizAttempt;
        score: number | null;
        passed: boolean | null;
        xpAwarded: number;
      };
    }
  | { ok: false; status: 400; error: { kind: "validation_error"; message: string } }
  | {
      ok: false;
      status: 400;
      error: { kind: "invalid_answer"; questionId: string; reason: string };
    }
  | { ok: false; status: 401; error: { kind: "unauthorized" } }
  | { ok: false; status: 404; error: { kind: "quiz_not_found" } }
  | { ok: false; status: 500; error: { kind: "internal_error"; message: string } };

// ── Pure function ───────────────────────────────────────────────

export async function processQuizAttempt(
  deps: ProcessQuizAttemptDeps,
  input: { quizId: string; userId: string; body: unknown },
): Promise<ProcessQuizAttemptResult> {
  // ── 1. Auth ─────────────────────────────────────────────────
  if (!input.userId) {
    return { ok: false, status: 401, error: { kind: "unauthorized" } };
  }

  // ── 2. Body validation ─────────────────────────────────────
  const parsed = AttemptBodySchema.safeParse(input.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      status: 400,
      error: {
        kind: "validation_error",
        message: issue?.message ?? "Invalid request body",
      },
    };
  }
  const body = parsed.data;

  // ── 3. Run use case ────────────────────────────────────────
  const useCase = new RecordQuizAttempt(deps);
  const result = await useCase.execute({
    userId: input.userId,
    quizId: input.quizId,
    answers: body.answers,
  });

  if (!result.ok) {
    return mapUseCaseError(result.error);
  }

  return {
    ok: true,
    status: 200,
    value: result.value,
  };
}

// ── Error mapping ──────────────────────────────────────────────

function mapUseCaseError(error: RecordQuizAttemptError): ProcessQuizAttemptResult {
  switch (error.kind) {
    case "quiz_not_found":
      return { ok: false, status: 404, error: { kind: "quiz_not_found" } };
    case "invalid_answer":
      return {
        ok: false,
        status: 400,
        error: {
          kind: "invalid_answer",
          questionId: error.questionId,
          reason: error.reason,
        },
      };
    // StartQuizAttemptError, AnswerQuestionError, CompleteQuizAttemptError,
    // QuizAttemptRepositoryError — these are internal state errors that
    // shouldn't happen if the use case ran with valid input. Treat as 500.
    default:
      return {
        ok: false,
        status: 500,
        error: { kind: "internal_error", message: "Internal quiz attempt error" },
      };
  }
}
