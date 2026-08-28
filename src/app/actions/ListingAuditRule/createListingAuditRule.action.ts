/**
 * Server action to create a new ListingAuditRule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 * Admin-only action.
 */

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { CreateListingAuditRule } from "@/usecases/ListingAuditRule/CreateListingAuditRule";
import type { CreateListingAuditRuleInput } from "@/usecases/ListingAuditRule/CreateListingAuditRule";

export async function createListingAuditRuleAction(input: CreateListingAuditRuleInput) {
  const admin = await requireAdmin();
  const { createListingAuditRule } = buildContainer();
  const result = await createListingAuditRule.execute({
    ...input,
    createdBy: admin.id,
  });
  if (!result.ok) {
    console.error("Failed to create listing audit rule:", result.error);
  }
  redirect("/admin/simulators/listing-audit/rules");
}
