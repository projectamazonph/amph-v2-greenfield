/**
 * RecordRetrievalCheck — log one SelfCheck answer (LEARN-040).
 *
 * Validates the row in the domain, persists it, and returns the id.
 * Never blocks the learner: the SelfCheck UI shows the explanation
 * from local state first and fires this best-effort. A storage
 * failure surfaces as `db_error` to the action, which swallows it.
 */

import { Result } from "@/domain/shared/Result";
import {
  createRetrievalCheck,
  type CreateRetrievalCheckError,
  type RetrievalCheckAttempt,
} from "@/domain/entities/RetrievalCheckAttempt";
import type { IRetrievalCheckRepository } from "@/ports/repositories/IRetrievalCheckRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface RecordRetrievalCheckInput {
  actorId: string;
  lessonSlug: string;
  checkId: string;
  correct: boolean;
}

export type RecordRetrievalCheckError =
  CreateRetrievalCheckError | { kind: "db_error"; message: string };

export interface RecordRetrievalCheckDeps {
  retrievalCheckRepo: IRetrievalCheckRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class RecordRetrievalCheck {
  constructor(private readonly deps: RecordRetrievalCheckDeps) {}

  async execute(
    input: RecordRetrievalCheckInput,
  ): Promise<Result<RetrievalCheckAttempt, RecordRetrievalCheckError>> {
    const built = createRetrievalCheck({
      id: this.deps.idGen.newId(),
      userId: input.actorId,
      lessonSlug: input.lessonSlug,
      checkId: input.checkId,
      correct: input.correct,
      createdById: input.actorId,
      createdAt: this.deps.clock.now(),
    });
    if (!built.ok) return built;
    const saved = await this.deps.retrievalCheckRepo.record(built.value);
    if (!saved.ok) {
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    return Result.ok(saved.value);
  }
}
