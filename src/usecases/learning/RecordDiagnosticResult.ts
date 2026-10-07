/**
 * RecordDiagnosticResult — use case for persisting a student's
 * pre-course diagnostic outcome and emitting the structured analytics log event.
 */

import {
  createDiagnosticResult,
  type UserDiagnosticResult,
} from "@/domain/learning/diagnostic/UserDiagnosticResult";
import { Result } from "@/domain/shared/Result";
import type { DiagnosticOutcome } from "@/lib/diagnostic";
import type { Logger } from "@/ports/observability/Logger";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { Clock } from "@/ports/system/Clock";

export interface RecordDiagnosticResultDeps {
  readonly userRepo: UserRepository;
  readonly logger: Logger;
  readonly clock?: Clock;
}

export class RecordDiagnosticResult {
  constructor(private readonly deps: RecordDiagnosticResultDeps) {}

  async execute(params: {
    userId: string;
    outcome: DiagnosticOutcome;
    completedAt?: Date;
  }): Promise<Result<UserDiagnosticResult, UserError>> {
    const timestamp = params.completedAt ?? this.deps.clock?.now() ?? new Date();
    const diagnostic = createDiagnosticResult(params.outcome, timestamp);

    const recordResult = await this.deps.userRepo.recordDiagnostic(params.userId, diagnostic);
    if (!recordResult.ok) {
      return recordResult;
    }

    this.deps.logger.info("learning_event:diagnostic_completed", {
      userId: params.userId,
      outcome: diagnostic.outcome,
    });

    return Result.ok(recordResult.value);
  }
}
