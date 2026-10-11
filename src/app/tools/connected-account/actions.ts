/**
 * Connected Account — server actions.
 *
 * STORY-089. The simulator mirrors a (mock) Amazon Advertising API:
 * the scenario publishes a snapshot of campaigns with per-keyword
 * economics and a recent Search Term Report, the student responds
 * with bids and triage decisions, and `gradeAttempt()` scores the
 * response against the ground truth baked into the scenario.
 *
 * Unlike the other 5 simulators, the Connected-Account tool does not
 * go through the full StartSimulatorAttempt / saveSimulatorDecision /
 * SubmitSimulatorAttempt / GradeSimulatorAttempt lifecycle. The story
 * doc is explicit: "The simulator is intentionally side-effect-free."
 * There is no attempt record to persist because the only persistence
 * the simulator needs is the published scenario, which is already on
 * the SimulatorScenario row, and the student's response is graded
 * immediately. This keeps the slice focused on what the story asks
 * for (a sixth registry entry, a published scenario, a working
 * grading policy) without dragging in the persistence flow that
 * the other simulators happen to need.
 *
 * The action validates the input shape with zod, resolves the
 * published scenario server-side (so a student cannot forge the
 * economics or the search terms — they only ever send their own
 * decisions), runs the simulator, and returns the formative grade.
 */

"use server";

import { z } from "zod";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import { studentErrorCopy } from "@/lib/studentErrorCopy";
import type {
  ConnectedAccountBidDecision,
  ConnectedAccountInput,
  ConnectedAccountOutput,
  ConnectedAccountScenario,
  ConnectedAccountTriageAction,
  ConnectedAccountTriageDecision,
} from "@/domain/simulator/connected-account";
import { ConnectedAccountSimulator } from "@/domain/simulator/connected-account/ConnectedAccountSimulator";
import { connectedAccountScenarioContentSchema } from "./scenarioContent";

const bidDecisionSchema = z.object({
  keywordId: z.string().min(1),
  newBidMinor: z.number().nonnegative().int(),
});

const triageActions = [
  "keep",
  "optimize",
  "pause",
  "negate_exact",
  "negate_phrase",
] as const satisfies readonly ConnectedAccountTriageAction[];

const triageDecisionSchema = z.object({
  termId: z.string().min(1),
  action: z.enum(triageActions),
});

const attemptSchema = z.object({
  bidDecisions: z.array(bidDecisionSchema).min(1).optional(),
  triageDecisions: z.array(triageDecisionSchema).min(1).optional(),
  // Mode is accepted but intentionally unused today (the Connected-Account
  // simulator has no Challenge-mode XP bonus — STORY-089 says
  // "intentionally side-effect-free"). Accepted so the client can pass
  // it through the SimulatorModeToggle like every other tool without
  // an action signature mismatch.
  mode: z.enum(["guided", "practice", "challenge", "credential", "instructor"]).optional(),
});

export type ConnectedAccountAttemptInput = z.infer<typeof attemptSchema>;

export type ConnectedAccountAttemptResponse =
  | { ok: true; value: ConnectedAccountAttemptResult }
  | { ok: false; error: { kind: "unauthorized" } }
  | {
      ok: false;
      error: {
        kind: "validation_error" | "scenario_error" | "grading_error";
        message: string;
      };
    };

export interface ConnectedAccountAttemptResult {
  readonly output: ConnectedAccountOutput;
  readonly mode: SimulatorMode;
}

export async function connectedAccountAttempt(
  input: unknown,
): Promise<ConnectedAccountAttemptResponse> {
  // ── 1. Validate ───────────────────────────────────────────────────
  const parseResult = attemptSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: {
        kind: "validation_error",
        message: parseResult.error.issues.map((i) => i.message).join("; "),
      },
    };
  }
  const { bidDecisions, triageDecisions, mode } = parseResult.data;
  const resolvedMode: SimulatorMode = mode ?? "practice";

  // ── 2. Authenticate ──────────────────────────────────────────────
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  // ── 3. Resolve the published scenario server-side ────────────────
  const container = buildContainer();
  const scenarioResult = await container.scenarioRepo.findPublished("connected-account");
  if (!scenarioResult.ok || !scenarioResult.value) {
    return {
      ok: false,
      error: {
        kind: "scenario_error",
        message: "No published connected-account scenario found",
      },
    };
  }
  const scenario = scenarioResult.value;

  let parsedScenario;
  try {
    parsedScenario = connectedAccountScenarioContentSchema.parse(scenario.inputSchema);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "scenario_error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
  const domainScenario: ConnectedAccountScenario = parsedScenario;

  // ── 4. Build simulator input ──────────────────────────────────────
  const simInput: ConnectedAccountInput = {
    scenario: domainScenario,
    ...(bidDecisions !== undefined ? { bidDecisions } : {}),
    ...(triageDecisions !== undefined ? { triageDecisions } : {}),
  };

  // ── 5. Run simulator ──────────────────────────────────────────────
  let output: ConnectedAccountOutput;
  try {
    const sim = new ConnectedAccountSimulator();
    output = await sim.run(simInput);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "grading_error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  return {
    ok: true,
    value: { output, mode: resolvedMode },
  };
}

// Re-export types so callers can import from this module only.
export type {
  ConnectedAccountBidDecision,
  ConnectedAccountOutput,
  ConnectedAccountScenario,
  ConnectedAccountTriageAction,
  ConnectedAccountTriageDecision,
};
