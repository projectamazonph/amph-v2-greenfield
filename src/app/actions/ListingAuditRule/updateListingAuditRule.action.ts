/**
 * Server action to update a ListingAuditRule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 * Admin-only action.
 */

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { UpdateListingAuditRule } from "@/usecases/ListingAuditRule/UpdateListingAuditRule";
import type { UpdateListingAuditRuleInput } from "@/usecases/ListingAuditRule/UpdateListingAuditRule";

export async function updateListingAuditRuleAction(input: UpdateListingAuditRuleInput) {
  await requireAdmin();
  const { updateListingAuditRule } = buildContainer();
  const result = await updateListingAuditRule.execute(input);
  if (!result.ok) {
    console.error("Failed to update listing audit rule:", result.error);
  }
  redirect("/admin/simulators/listing-audit/rules");
}
