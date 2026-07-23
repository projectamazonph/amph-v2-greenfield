/**
 * Keyword Research — server action.
 *
 * Reuses the ListingAuditSimulator's keyword generation logic.
 * The student enters a niche, and we generate a prioritized keyword
 * list they can filter and export.
 */

"use server";

import { buildContainer } from "@/composition/container";
import type { ListingAuditInput } from "@/domain/simulator/listing-audit/ListingAuditInput";
import type { ListingAuditOutput } from "@/domain/simulator/listing-audit/ListingAuditOutput";

export type KeywordResearchInput = {
  niche: string;
};

export type KeywordResearchResult =
  | { ok: true; value: ListingAuditOutput["keywordResearch"] }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

export async function runKeywordResearch(
  input: KeywordResearchInput,
): Promise<KeywordResearchResult> {
  if (!input || typeof input.niche !== "string" || input.niche.trim().length === 0) {
    return {
      ok: false,
      error: { kind: "invalid_input", message: "Niche is required." },
    };
  }

  const container = buildContainer();
  const sim = container.simulatorRegistry.get("listing-audit");
  if (!sim) {
    return {
      ok: false,
      error: { kind: "engine_error", message: "Listing Audit simulator not registered" },
    };
  }

  // Run with empty listing — the simulator will skip audit and only emit keywords
  const domainInput: ListingAuditInput = {
    title: "",
    bullets: [],
    description: "",
    category: "General",
    niche: input.niche.trim(),
  };

  try {
    const output = (await sim.run(domainInput)) as ListingAuditOutput;
    return { ok: true, value: output.keywordResearch };
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
