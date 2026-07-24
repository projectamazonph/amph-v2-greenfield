/**
 * submitSimulatorAttempt — server action.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

"use server";

import { SubmitSimulatorAttempt } from "@/usecases/SubmitSimulatorAttempt";
import { getContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export interface SubmitSimulatorAttemptInput {
  attemptId: string;
  idempotencyKey?: string;
}

export interface SubmitSimulatorAttemptResponse {
  status?: string;
  submittedAt?: string;
  error?: string;
}

/**
 * Submit a simulator attempt for grading.
 * Verifies the user owns the attempt before transitioning.
 */
export async function submitSimulatorAttempt(
  input: SubmitSimulatorAttemptInput,
): Promise<SubmitSimulatorAttemptResponse> {
  // Auth guard
  const user = await getSessionUser();
  if (!user) {
    return { error: "unauthenticated" };
  }

  const container = getContainer();

  // Verify ownership
  const attemptResult = await container.simulatorAttemptRepo.findByAttemptId(input.attemptId);
  if (attemptResult.ok && attemptResult.value !== null) {
    if (attemptResult.value.userId !== user.id) {
      return { error: "forbidden" };
    }
  }

  const uc = new SubmitSimulatorAttempt({
    attemptRepo: container.simulatorAttemptRepo,
  });

  const result = await uc.execute({
    attemptId: input.attemptId,
    idempotencyKey: input.idempotencyKey,
  });

  if (result.ok) {
    return {
      status: result.value.status,
      submittedAt: result.value.submittedAt.toISOString(),
    };
  }

  return { error: result.error.kind };
}
