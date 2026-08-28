/**
 * Server action to delete a ListingAuditRule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 * Admin-only action.
 */

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { DeleteListingAuditRule } from "@/usecases/ListingAuditRule/DeleteListingAuditRule";

export async function deleteListingAuditRuleAction(id: string) {
  await requireAdmin();
  const { deleteListingAuditRule } = buildContainer();
  const result = await deleteListingAuditRule.execute(id);
  if (!result.ok) {
    console.error("Failed to delete listing audit rule:", result.error);
  }
  redirect("/admin/simulators/listing-audit/rules");
}
