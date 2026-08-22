/**
 * setScenarioCalibrationAction — admin server action to upsert the
 * instructor calibration band map for a (simulatorId, scenarioKey) pair.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 * Thin wrapper around SetScenarioCalibration.execute.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  SetScenarioCalibration,
  SetScenarioCalibrationInput,
  SetScenarioCalibrationError,
} from "@/usecases/SetScenarioCalibration";
import type { UserRepository } from "@/ports/repositories/UserRepository";

/**
 * Input type the page/form provides — no instructorId (the action
 * injects it from the session admin id, matching the convention in
 * createSimulatorScenario.action.ts).
 */
export type SetScenarioCalibrationPageInput = Omit<
  SetScenarioCalibrationInput,
  "instructorId"
>;

export type SetScenarioCalibrationActionResult = Result<
  { calibrationId: string },
  SetScenarioCalibrationError | { kind: "unauthorized" }
>;

async function defaultGetCurrentAdminId(
  container: { userRepo: UserRepository },
): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  if (userResult.value.role !== "ADMIN") return null;
  return userId;
}

export async function performSetScenarioCalibration(
  container: {
    userRepo: UserRepository;
    setScenarioCalibration: SetScenarioCalibration;
  },
  input: SetScenarioCalibrationPageInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<SetScenarioCalibrationActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.setScenarioCalibration.execute({
    ...input,
    instructorId: adminId,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ calibrationId: result.value.id });
}

export async function setScenarioCalibrationAction(
  input: SetScenarioCalibrationPageInput,
): Promise<SetScenarioCalibrationActionResult> {
  const container = buildContainer();
  return performSetScenarioCalibration(
    container,
    input,
    defaultGetCurrentAdminId,
  );
}
