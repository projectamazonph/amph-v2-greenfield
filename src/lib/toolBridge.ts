/**
 * Pure lesson-to-tool bridge validator — no server-only code.
 *
 * Joins the curriculum inventory (LEARN-001) with the registered
 * simulator ids, the public-claim tier-simulator allowlist (LEARN-003),
 * the set of published simulator scenario keys, and the SimGrid
 * simulator-id allowlist (ADR-026). Surfaces every structural failure
 * in one pass so the release check fails closed before the production
 * promotion.
 */

import { SIMGRID_SIMULATOR_IDS } from "@/domain/simgrid";

export interface BridgeLessonRef {
  readonly slug: string;
  readonly toolBridge:
    | { readonly kind: "none" }
    | { readonly kind: "simulator"; readonly target: string }
    | { readonly kind: "simgrid"; readonly target: string };
}

export interface BridgeTierAllowlist {
  readonly tier: string;
  readonly simulatorTargets: readonly string[];
}

export interface ToolBridgeValidationInput {
  readonly registeredSimulatorIds: readonly string[];
  readonly publishedSimulatorKeys: readonly string[];
  readonly lessons: readonly BridgeLessonRef[];
  readonly tiers: readonly BridgeTierAllowlist[];
  /**
   * Allowlist of SimGrid simulator ids. Defaults to
   * `SIMGRID_SIMULATOR_IDS` from `@/domain/simgrid` so callers that
   * don't care about SimGrid don't have to plumb the list through.
   * Tests inject a smaller set to exercise the unknown-target branch.
   */
  readonly simgridSimulatorIds?: readonly string[];
}

export type ToolBridgeValidationError =
  | {
      readonly kind: "bridge_target_not_registered";
      readonly slug: string;
      readonly target: string;
    }
  | {
      readonly kind: "bridge_target_unpublished";
      readonly slug: string;
      readonly target: string;
    }
  | {
      readonly kind: "bridge_target_not_in_any_tier";
      readonly slug: string;
      readonly target: string;
    }
  | {
      readonly kind: "bridge_target_unknown_simgrid";
      readonly slug: string;
      readonly target: string;
    }
  | {
      readonly kind: "registered_simulator_unreachable";
      readonly simulatorId: string;
    };

/**
 * Returns every bridge failure in one pass. Returns an empty array
 * when every bridge is consistent with the input sources. The
 * validator never throws: a missing source produces a single
 * failure that is included in the result.
 */
export function validateToolBridges(
  input: ToolBridgeValidationInput,
): readonly ToolBridgeValidationError[] {
  const registered = new Set<string>(input.registeredSimulatorIds);
  // An empty published list means the caller skipped the
  // published-scenario signal (filesystem-only CI). Skip the
  // published check rather than reporting every bridge as broken.
  const skipPublished = input.publishedSimulatorKeys.length === 0;
  const published = new Set<string>(input.publishedSimulatorKeys);
  const simgridIds = new Set<string>(
    input.simgridSimulatorIds ?? (SIMGRID_SIMULATOR_IDS as readonly string[]),
  );
  const errors: ToolBridgeValidationError[] = [];

  for (const lesson of input.lessons) {
    if (lesson.toolBridge.kind === "none") continue;

    if (lesson.toolBridge.kind === "simgrid") {
      // Per ADR-026, SimGrid drills are free for any signed-in user,
      // so a simgrid target does not need tier coverage and is not
      // gated by published-scenario keys (SimGrid ships as vendored
      // static assets, not AMPH scenario rows). The only check is the
      // allowlist — a typo in a target should fail the release.
      const target = lesson.toolBridge.target;
      if (!simgridIds.has(target)) {
        errors.push({
          kind: "bridge_target_unknown_simgrid",
          slug: lesson.slug,
          target,
        });
      }
      continue;
    }

    const target = lesson.toolBridge.target;

    if (!registered.has(target)) {
      errors.push({
        kind: "bridge_target_not_registered",
        slug: lesson.slug,
        target,
      });
      continue;
    }

    const inAnyTier = input.tiers.some((tier) => tier.simulatorTargets.includes(target));
    if (!inAnyTier) {
      errors.push({
        kind: "bridge_target_not_in_any_tier",
        slug: lesson.slug,
        target,
      });
    }

    if (!skipPublished && !published.has(target)) {
      errors.push({
        kind: "bridge_target_unpublished",
        slug: lesson.slug,
        target,
      });
    }
  }

  for (const simulatorId of registered) {
    const reachable = input.tiers.some((tier) => tier.simulatorTargets.includes(simulatorId));
    if (!reachable) {
      errors.push({
        kind: "registered_simulator_unreachable",
        simulatorId,
      });
    }
  }

  return errors;
}
