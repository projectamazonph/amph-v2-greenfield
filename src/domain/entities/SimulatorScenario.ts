/**
 * SimulatorScenario — an immutable scenario template for a simulator.
 *
 * STORY-036: Simulator infrastructure.
 *
 * Describes one scenario within a simulator: input/output JSON schemas,
 * difficulty, and estimated time. Immutable — created once, never mutated.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ────────────────────────────────────────────────────────────────

/** IDs for the four planned simulators. */
export type SimulatorId = "bid-elevator" | "str-triage" | "campaign-builder" | "listing-audit";

export type SimulatorScenarioError =
  { kind: "invalid_simulator_id" } | { kind: "invalid_difficulty" };

/** Difficulty level for a scenario. */
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface SimulatorScenario {
  readonly id: string;
  readonly simulatorId: SimulatorId;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
}

// ── Factory ──────────────────────────────────────────────────────────────

const VALID_SIMULATOR_IDS: readonly SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
];

const VALID_DIFFICULTIES: readonly Difficulty[] = ["beginner", "intermediate", "advanced"];

export function createSimulatorScenario(params: {
  id: string;
  simulatorId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  difficulty: string;
  estimatedMinutes: number;
}): Result<SimulatorScenario, SimulatorScenarioError> {
  if (!VALID_SIMULATOR_IDS.includes(params.simulatorId as SimulatorId)) {
    return Result.err({ kind: "invalid_simulator_id" });
  }

  if (!VALID_DIFFICULTIES.includes(params.difficulty as Difficulty)) {
    return Result.err({ kind: "invalid_difficulty" });
  }

  return Result.ok({
    id: params.id,
    simulatorId: params.simulatorId as SimulatorId,
    name: params.name,
    description: params.description,
    inputSchema: params.inputSchema,
    outputSchema: params.outputSchema,
    difficulty: params.difficulty as Difficulty,
    estimatedMinutes: params.estimatedMinutes,
  });
}
