/**
 * Campaign Builder — server action.
 *
 * Runs the CampaignBuilderSimulator with the user's structure
 * (product, budget, targeting) and returns the suggested
 * campaign structure.
 */

"use server";

import { buildContainer } from "@/composition/container";
import type {
  CampaignBuilderInput,
  TargetingStrategy,
} from "@/domain/simulator/campaign-builder/CampaignBuilderInput";
import type { CampaignBuilderOutput } from "@/domain/simulator/campaign-builder/CampaignBuilderOutput";

export type BuildCampaignInput = {
  productCategory: string;
  productNiche: string;
  monthlyBudget: number;
  targetingStrategy: TargetingStrategy;
};

export type BuildCampaignResult =
  | { ok: true; value: CampaignBuilderOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

const VALID_STRATEGIES: ReadonlyArray<TargetingStrategy> = ["auto", "manual", "hybrid"];

export async function buildCampaign(
  input: BuildCampaignInput,
): Promise<BuildCampaignResult> {
  if (
    !input ||
    typeof input.productCategory !== "string" ||
    input.productCategory.length === 0 ||
    typeof input.productNiche !== "string" ||
    input.productNiche.length === 0 ||
    typeof input.monthlyBudget !== "number" ||
    input.monthlyBudget <= 0 ||
    !VALID_STRATEGIES.includes(input.targetingStrategy)
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: "Need product category, niche, budget > 0, and a valid targeting strategy",
      },
    };
  }

  const container = buildContainer();
  const sim = container.simulatorRegistry.get("campaign-builder");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Campaign Builder simulator not registered" },
    };
  }

  const domainInput: CampaignBuilderInput = {
    productCategory: input.productCategory,
    productNiche: input.productNiche,
    monthlyBudget: input.monthlyBudget,
    targetingStrategy: input.targetingStrategy,
  };
  try {
    const output = (await sim.run(domainInput)) as CampaignBuilderOutput;
    return { ok: true, value: output };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "engine_error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
