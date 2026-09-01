/**
 * Server action to resolve finding action using rules.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { ResolveFindingAction } from "@/usecases/ListingAuditRule/ResolveFindingAction";
import type { ResolveFindingActionInput, ResolvedFindingAction } from "@/usecases/ListingAuditRule/ResolveFindingAction";

export async function resolveFindingActionAction(input: ResolveFindingActionInput): Promise<ResolvedFindingAction> {
  const { resolveFindingAction } = buildContainer();
  const result = await resolveFindingAction.execute(input);
  if (!result.ok) {
    // Fallback to default based on severity
    const defaultMap = {
      critical: { expectedAction: "fixNow", acceptedActions: ["fixNow"] as const, rationale: "Critical findings must be fixed" },
      warning: { expectedAction: "defer", acceptedActions: ["fixNow", "defer"] as const, rationale: "Warning can be deferred or fixed" },
      info: { expectedAction: "skip", acceptedActions: ["skip", "defer"] as const, rationale: "Info findings can be skipped" },
    };
    return defaultMap[input.severity] ?? defaultMap.warning;
  }
  return result.value;
}
