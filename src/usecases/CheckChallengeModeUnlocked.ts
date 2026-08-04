/**
 * CheckChallengeModeUnlocked — STORY-088.
 *
 * A student unlocks Challenge mode for a simulator once they have passed
 * that simulator at least once in Practice mode. "Passed" means a graded
 * attempt whose score met the passing threshold for its
 * (simulatorId, difficulty, mode) ScorePolicy — scored against whichever
 * policy applied to that attempt's difficulty at grading time, not the
 * simulator's current default. Checked across all scenario versions of the
 * simulator, not just the currently published one, so publishing a new
 * scenario version never revokes eligibility a student already earned.
 *
 * `hasEverPassedSimulatorInMode` is exported standalone (not just as a
 * method) because the per-simulator attempt actions
 * (src/app/tools/<name>/actions.ts) reuse the same logic with
 * mode="challenge" to decide whether a Challenge-mode pass has already
 * earned its one-time XP bonus — that's a different question from "is
 * Challenge unlocked" (which only ever checks mode="practice"), but the
 * "did the student ever pass this simulator in mode X" mechanics are
 * identical.
 */

import { Result } from "@/domain/shared/Result";
import { isPassed } from "@/domain/entities/ScorePolicy";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { Difficulty } from "@/domain/entities/SimulatorScenario";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type {
  ISimulatorAttemptRepository,
  SimulatorAttemptError,
} from "@/ports/repositories/ISimulatorAttemptRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";

export interface HasEverPassedSimulatorInModeDeps {
  attemptRepo: ISimulatorAttemptRepository;
  scorePolicyRepo: IScorePolicyRepository;
}

export type HasEverPassedSimulatorInModeError = { kind: "db_error"; message: string };

/**
 * True if the user has any graded attempt for this (simulatorId, mode)
 * pair — across all scenario versions and difficulties — whose score met
 * its ScorePolicy's passing threshold.
 *
 * `excludeAttemptId` skips one attempt id from consideration; pass the
 * attempt just graded in the current request when checking "had the
 * student *already* earned this before now," so a first-ever pass reads
 * as not-yet-earned rather than self-satisfying the check.
 */
export async function hasEverPassedSimulatorInMode(
  deps: HasEverPassedSimulatorInModeDeps,
  input: {
    userId: string;
    simulatorId: SimulatorId;
    mode: SimulatorMode;
    excludeAttemptId?: string;
  },
): Promise<Result<boolean, HasEverPassedSimulatorInModeError>> {
  const attemptsResult = await deps.attemptRepo.findByUserAndSimulator(
    input.userId,
    input.simulatorId,
    { mode: input.mode, status: "graded" },
  );
  if (Result.isErr(attemptsResult)) {
    return Result.err({ kind: "db_error", message: mapErrKind(attemptsResult.error) });
  }

  const policyCache = new Map<Difficulty, ScorePolicy | null>();

  for (const attempt of attemptsResult.value) {
    if (attempt.score === null || attempt.id === input.excludeAttemptId) {
      continue;
    }

    let policy = policyCache.get(attempt.difficulty);
    if (policy === undefined) {
      const policyResult = await deps.scorePolicyRepo.findBySimulatorAndDifficulty(
        input.simulatorId,
        attempt.difficulty,
        input.mode,
      );
      if (Result.isErr(policyResult)) {
        return Result.err({ kind: "db_error", message: mapErrKind(policyResult.error) });
      }
      policy = policyResult.value;
      policyCache.set(attempt.difficulty, policy);
    }

    if (policy !== null && isPassed(attempt.score, policy)) {
      return Result.ok(true);
    }
  }

  return Result.ok(false);
}

function mapErrKind(err: SimulatorAttemptError): string {
  return err.kind === "db_error" ? err.message : err.kind;
}

// ── Use case ────────────────────────────────────────────────────────────

export interface CheckChallengeModeUnlockedInput {
  userId: string;
  simulatorId: SimulatorId;
}

export type CheckChallengeModeUnlockedDeps = HasEverPassedSimulatorInModeDeps;

export type CheckChallengeModeUnlockedError = HasEverPassedSimulatorInModeError;

export interface CheckChallengeModeUnlockedResult {
  readonly unlocked: boolean;
}

export class CheckChallengeModeUnlocked {
  constructor(private readonly deps: CheckChallengeModeUnlockedDeps) {}

  async execute(
    input: CheckChallengeModeUnlockedInput,
  ): Promise<Result<CheckChallengeModeUnlockedResult, CheckChallengeModeUnlockedError>> {
    const result = await hasEverPassedSimulatorInMode(this.deps, {
      userId: input.userId,
      simulatorId: input.simulatorId,
      mode: "practice",
    });
    if (Result.isErr(result)) {
      return result;
    }
    return Result.ok({ unlocked: result.value });
  }
}
