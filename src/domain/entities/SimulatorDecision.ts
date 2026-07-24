/**
 * SimulatorDecision — a single decision made by a student within a simulator attempt.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Decisions are immutable once saved. Each attempt can have multiple revisions
 * (decisions) as the student progresses through a scenario.
 */

import { Result } from "@/domain/shared/Result";

export interface SimulatorDecision {
  readonly id: string;
  readonly attemptId: string;
  readonly revision: number;
  readonly decisionData: Record<string, unknown>;
  readonly submittedAt: Date;
}

export interface CreateSimulatorDecisionParams {
  readonly id: string;
  readonly attemptId: string;
  readonly decisionData: Record<string, unknown>;
  readonly revision?: number;
  readonly submittedAt?: Date;
}

/**
 * Factory for creating a SimulatorDecision.
 * revision defaults to 1 if not provided.
 * submittedAt defaults to now if not provided.
 */
export function createSimulatorDecision(
  params: CreateSimulatorDecisionParams,
): Result<SimulatorDecision, never> {
  return Result.ok({
    id: params.id,
    attemptId: params.attemptId,
    revision: params.revision ?? 1,
    decisionData: params.decisionData,
    submittedAt: params.submittedAt ?? new Date(),
  });
}
