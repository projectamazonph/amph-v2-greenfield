/**
 * Server action to list all ListingAuditRules.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { ListListingAuditRules } from "@/usecases/ListingAuditRule/ListListingAuditRules";

export async function listListingAuditRulesAction() {
  const { listListingAuditRules } = buildContainer();
  const result = await listListingAuditRules.execute();
  return result;
}
