/**
 * Server action to get a ListingAuditRule by ID.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { GetListingAuditRule } from "@/usecases/ListingAuditRule/GetListingAuditRule";

export async function getListingAuditRuleAction(id: string) {
  const { getListingAuditRule } = buildContainer();
  const result = await getListingAuditRule.execute(id);
  return result;
}
