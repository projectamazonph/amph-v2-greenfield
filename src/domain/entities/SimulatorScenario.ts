/**
 * SimulatorScenario — a versioned scenario template for a simulator.
 *
 * STORY-036: Simulator infrastructure. STORY-085: publishing + versioning.
 *
 * Describes one scenario within a simulator: input/output JSON schemas,
 * difficulty, and estimated time. A scenario has a lifecycle
 * (draft → published → archived) and belongs to a `scenarioKey` family —
 * publishing a new draft under the same key supersedes (archives) the
 * previously published version, keeping full version history queryable.
 * A published/archived scenario is immutable; only a draft can be edited.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ────────────────────────────────────────────────────────────────

/** IDs for the five registered simulators. */
export type SimulatorId =
  "bid-elevator" | "str-triage" | "campaign-builder" | "listing-audit" | "keyword-research";

export type SimulatorScenarioError =
  { kind: "invalid_simulator_id" } | { kind: "invalid_difficulty" };

/** Difficulty level for a scenario. */
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Lifecycle state of a scenario version. */
export type ScenarioStatus = "draft" | "published" | "archived";

const VALID_SCENARIO_STATUSES: readonly ScenarioStatus[] = ["draft", "published", "archived"];

/**
 * Type guard for a value read back from persistence. A repository adapter
 * should call this before trusting a stored string as a `ScenarioStatus`.
 */
export function isValidScenarioStatus(s: string): s is ScenarioStatus {
  return (VALID_SCENARIO_STATUSES as readonly string[]).includes(s);
}

export interface SimulatorScenario {
  readonly id: string;
  /** Stable identity grouping every version of "the same" scenario. */
  readonly scenarioKey: string;
  /** Starts at 1, increments with each new draft under the same scenarioKey. */
  readonly version: number;
  readonly status: ScenarioStatus;
  readonly simulatorId: SimulatorId;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Factory ──────────────────────────────────────────────────────────────

const VALID_SIMULATOR_IDS: readonly SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
  "keyword-research",
];

const VALID_DIFFICULTIES: readonly Difficulty[] = ["beginner", "intermediate", "advanced"];

/**
 * Creates a new scenario draft. `scenarioKey` defaults to `id` (a brand-new
 * scenario family); `version` defaults to 1. Always starts as `"draft"` —
 * publishing is a separate, explicit step (see `publishScenario`).
 */
export function createSimulatorScenario(params: {
  id: string;
  scenarioKey?: string;
  version?: number;
  simulatorId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  difficulty: string;
  estimatedMinutes: number;
  now?: Date;
}): Result<SimulatorScenario, SimulatorScenarioError> {
  if (!VALID_SIMULATOR_IDS.includes(params.simulatorId as SimulatorId)) {
    return Result.err({ kind: "invalid_simulator_id" });
  }

  if (!VALID_DIFFICULTIES.includes(params.difficulty as Difficulty)) {
    return Result.err({ kind: "invalid_difficulty" });
  }

  const now = params.now ?? new Date();

  return Result.ok({
    id: params.id,
    scenarioKey: params.scenarioKey ?? params.id,
    version: params.version ?? 1,
    status: "draft",
    simulatorId: params.simulatorId as SimulatorId,
    name: params.name,
    description: params.description,
    inputSchema: params.inputSchema,
    outputSchema: params.outputSchema,
    difficulty: params.difficulty as Difficulty,
    estimatedMinutes: params.estimatedMinutes,
    createdAt: now,
    updatedAt: now,
  });
}

// ── Lifecycle transitions ───────────────────────────────────────────────

export type PublishScenarioError = { kind: "not_draft" };

/** Only a draft may be published. */
export function publishScenario(
  scenario: SimulatorScenario,
  now: Date = new Date(),
): Result<SimulatorScenario, PublishScenarioError> {
  if (scenario.status !== "draft") {
    return Result.err({ kind: "not_draft" });
  }
  return Result.ok({ ...scenario, status: "published", updatedAt: now });
}

/**
 * Clones `source` into a new draft under the same `scenarioKey`, one
 * version ahead. Used to edit a published (or archived) scenario: create
 * a draft copy, change it, then publish the copy.
 */
export function createDraftFromScenario(
  source: SimulatorScenario,
  newId: string,
  now: Date = new Date(),
): SimulatorScenario {
  return {
    ...source,
    id: newId,
    version: source.version + 1,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

/** Archives a scenario (draft or published). Archived scenarios are immutable history. */
export function archiveScenario(
  scenario: SimulatorScenario,
  now: Date = new Date(),
): SimulatorScenario {
  return { ...scenario, status: "archived", updatedAt: now };
}
