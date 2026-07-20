/**
 * Listing Audit + Keyword Research — server action.
 *
 * Runs the ListingAuditSimulator on the user's revised listing
 * and returns the audit score + keyword research.
 */

"use server";

import { buildContainer } from "@/composition/container";
import type { ListingAuditInput } from "@/domain/simulator/listing-audit/ListingAuditInput";
import type { ListingAuditOutput } from "@/domain/simulator/listing-audit/ListingAuditOutput";

export type AuditListingInput = {
  title: string;
  bullets: ReadonlyArray<string>;
  description: string;
  category: string;
  niche: string;
};

export type AuditListingResult =
  | { ok: true; value: ListingAuditOutput }
  | { ok: false; error: { kind: "invalid_input" | "engine_error"; message: string } };

export async function auditListing(
  input: AuditListingInput,
): Promise<AuditListingResult> {
  if (
    !input ||
    typeof input.title !== "string" ||
    input.title.length === 0 ||
    !Array.isArray(input.bullets) ||
    input.bullets.some((b) => typeof b !== "string") ||
    typeof input.description !== "string" ||
    typeof input.category !== "string" ||
    input.category.length === 0 ||
    typeof input.niche !== "string" ||
    input.niche.length === 0
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid_input",
        message: "Need title, ≥0 bullets, description, category, niche",
      },
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

  const domainInput: ListingAuditInput = {
    title: input.title,
    bullets: input.bullets,
    description: input.description,
    category: input.category,
    niche: input.niche,
  };
  try {
    const output = (await sim.run(domainInput)) as ListingAuditOutput;
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
