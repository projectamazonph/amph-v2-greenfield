/**
 * saveSimulatorDecision — server action.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

"use server";

import { SaveSimulatorDecision } from "@/usecases/SaveSimulatorDecision";
import { getContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export interface SaveSimulatorDecisionInput {
  attemptId: string;
  decisionData: Record<string, unknown>;
}

export interface SaveSimulatorDecisionResponse {
  revision?: number;
  savedAt?: string;
  error?: string;
}

/**
 * Save a decision within an active simulator attempt.
 * Verifies the user owns the attempt before persisting.
 */
export async function saveSimulatorDecision(
  input: SaveSimulatorDecisionInput,
): Promise<SaveSimulatorDecisionResponse> {
  // Auth guard
  const user = await getSessionUser();
  if (!user) {
    return { error: "unauthenticated" };
  }

  const container = getContainer();

  // Verify ownership by looking up the attempt
  const attemptResult = await container.simulatorAttemptRepo.findByAttemptId(input.attemptId);
  if (attemptResult.ok && attemptResult.value !== null) {
    if (attemptResult.value.userId !== user.id) {
      return { error: "forbidden" };
    }
  }

  const uc = new SaveSimulatorDecision({
    attemptRepo: container.simulatorAttemptRepo,
  });

  const result = await uc.execute({
    attemptId: input.attemptId,
    decisionData: input.decisionData,
  });

  if (result.ok) {
    return {
      revision: result.value.revision,
      savedAt: result.value.savedAt.toISOString(),
    };
  }

  return { error: result.error.kind };
}
