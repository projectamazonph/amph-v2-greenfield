/**
 * startSimulatorAttempt — server action.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

"use server";

import { StartSimulatorAttempt } from "@/usecases/StartSimulatorAttempt";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import { getContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export interface StartSimulatorAttemptInput {
  simulatorId: SimulatorId;
  scenarioId: string;
  mode?: SimulatorMode;
}

export interface StartSimulatorAttemptResponse {
  attemptId?: string;
  scenarioId?: string;
  status?: string;
  seed?: string | null;
  startedAt?: string;
  error?: string;
}

/**
 * Start a new simulator attempt for the authenticated user.
 */
export async function startSimulatorAttempt(
  input: StartSimulatorAttemptInput,
): Promise<StartSimulatorAttemptResponse> {
  // Auth guard
  const user = await getSessionUser();
  if (!user) {
    return { error: "unauthenticated" };
  }

  const container = getContainer();

  const uc = new StartSimulatorAttempt({
    attemptRepo: container.simulatorAttemptRepo,
    scenarioRepo: container.scenarioRepo,
    idGen: container.idGen,
    clock: container.clock,
    recordAuditLog: container.recordAuditLog,
  });

  const result = await uc.execute({
    userId: user.id,
    simulatorId: input.simulatorId,
    scenarioId: input.scenarioId,
    mode: input.mode,
  });

  if (result.ok) {
    const attempt = result.value;
    return {
      attemptId: attempt.attemptId,
      scenarioId: attempt.scenarioId,
      status: attempt.status,
      seed: attempt.seed,
      startedAt: attempt.startedAt.toISOString(),
    };
  }

  return { error: result.error.kind };
}
