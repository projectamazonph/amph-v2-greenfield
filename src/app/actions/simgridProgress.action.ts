/**
 * recordSimgridProgressAction — server action for recording a SimGrid
 * iframe round-completion event into AMPH.
 *
 * ADR-026: SimGrid drills are additive practice. The iframe emits a
 * postMessage event on round-complete, and the SimgridFrame component
 * calls this action to mirror the attempt into AMPH's database.
 *
 * The "use server" wrapper builds the production container and reads
 * the session user. performRecordSimgridProgress is the testable core
 * — same split as createQuiz.action / simulator grading actions.
 */
"use server";

import { Result } from "@/domain/shared/Result";
import { isSimgridSimulatorId } from "@/domain/simgrid";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimgridBridgeAttempt } from "@/lib/simgrid/protocol";
import type {
  RecordSimgridProgress,
  RecordSimgridProgressError,
} from "@/usecases/simgrid/RecordSimgridProgress";

export type RecordSimgridProgressActionInput = {
  readonly attempt: SimgridBridgeAttempt;
};

export type RecordSimgridProgressActionError =
  | { kind: "unauthenticated" }
  | { kind: "invalid_input"; message: string }
  | RecordSimgridProgressError;

export type RecordSimgridProgressActionResult = Result<
  { readonly id: string; readonly recordedAt: string },
  RecordSimgridProgressActionError
>;

export type CurrentUserSummary = { readonly id: string };

export async function performRecordSimgridProgress(
  container: { recordSimgridProgress: RecordSimgridProgress },
  input: RecordSimgridProgressActionInput,
  getCurrentUser: () => Promise<CurrentUserSummary | null>,
): Promise<RecordSimgridProgressActionResult> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return Result.err({ kind: "unauthenticated" });

  const a = input.attempt;
  if (!isSimgridSimulatorId(a.simulatorId))
    return Result.err({ kind: "invalid_input", message: "unknown simulatorId" });
  if (typeof a.score !== "number" || !Number.isFinite(a.score) || a.score < 0 || a.score > 100)
    return Result.err({ kind: "invalid_input", message: "score out of range" });
  if (typeof a.passed !== "boolean")
    return Result.err({ kind: "invalid_input", message: "passed must be boolean" });

  const completedAt = new Date(a.completedAt);
  if (Number.isNaN(completedAt.getTime()))
    return Result.err({ kind: "invalid_input", message: "completedAt invalid" });

  const result = await container.recordSimgridProgress.execute({
    userId: sessionUser.id,
    simulatorId: a.simulatorId,
    score: a.score,
    passed: a.passed,
    completedAt,
    scenarioVersion: a.scenarioVersion,
    rubricVersion: a.rubricVersion,
    ...(a.scenarioId !== undefined ? { scenarioId: a.scenarioId } : {}),
    ...(a.policyVersion !== undefined ? { policyVersion: a.policyVersion } : {}),
  });

  if (!result.ok) return Result.err(result.error);
  return Result.ok({ id: result.value.id, recordedAt: completedAt.toISOString() });
}

async function defaultGetCurrentUser(): Promise<CurrentUserSummary | null> {
  const userId = await getSessionUserId();
  return userId ? { id: userId } : null;
}

export async function recordSimgridProgressAction(
  input: RecordSimgridProgressActionInput,
): Promise<RecordSimgridProgressActionResult> {
  const container = buildContainer();
  return performRecordSimgridProgress(container, input, defaultGetCurrentUser);
}
