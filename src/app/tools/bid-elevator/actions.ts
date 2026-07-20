/**
 * Bid Elevator — server action.
 *
 * Runs the BidElevatorSimulator with the user-tweaked bids and
 * returns the result. Called by the client form on submit.
 *
 * Input shape mirrors the BidElevatorInput domain type but is
 * validated as plain JSON (server actions receive FormData /
 * JSON, not domain types). Currency is in USD throughout.
 */

"use server";

import { buildContainer } from "@/composition/container";
import type { BidElevatorInput, KeywordBid } from "@/domain/simulator/bid-elevator/BidElevatorInput";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";

export type RunBidElevatorInput = {
  keywords: ReadonlyArray<{
    keyword: string;
    currentBid: number;
    currentCpc: number;
    volume: number;
  }>;
  budget: number;
  targetRoas: number;
};

export type RunBidElevatorResult =
  | { ok: true; value: BidElevatorOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

export async function runBidElevator(
  input: RunBidElevatorInput,
): Promise<RunBidElevatorResult> {
  if (
    !input ||
    !Array.isArray(input.keywords) ||
    input.keywords.length === 0 ||
    typeof input.budget !== "number" ||
    input.budget <= 0 ||
    typeof input.targetRoas !== "number" ||
    input.targetRoas <= 0
  ) {
    return {
      ok: false,
      error: { kind: "invalid_input", message: "Need ≥1 keyword, budget > 0, target ROAS > 0" },
    };
  }
  for (const k of input.keywords) {
    if (
      typeof k.keyword !== "string" ||
      typeof k.currentBid !== "number" ||
      k.currentBid < 0 ||
      typeof k.currentCpc !== "number" ||
      k.currentCpc < 0 ||
      typeof k.volume !== "number" ||
      k.volume < 0
    ) {
      return {
        ok: false,
        error: { kind: "invalid_input", message: `Bad keyword: ${JSON.stringify(k)}` },
      };
    }
  }

  const container = buildContainer();
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Bid Elevator simulator not registered" },
    };
  }

  const domainInput: BidElevatorInput = {
    keywords: input.keywords as readonly KeywordBid[],
    budget: input.budget,
    targetRoas: input.targetRoas,
  };
  try {
    const output = (await sim.run(domainInput)) as BidElevatorOutput;
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
