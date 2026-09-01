/**
 * /admin/simulators/listing-audit/rules - Listing Audit Rule management.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { listListingAuditRulesAction } from "@/app/actions/ListingAuditRule";
import styles from "./page.module.css";

export default async function ListingAuditRulesPage() {
  await requireAdmin();
  const { listingAuditRuleRepo } = buildContainer();
  const result = await listingAuditRuleRepo.listAll();
  const rules = result.ok ? result.value : [];

  return (
    <div>
      <TopBar title="Listing Audit Rules" subtitle="Manage context-aware ground truth rules" />
      
      <Card padding={6} className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Context-Aware Rules</h2>
          <Link href="/admin/simulators/listing-audit/rules/new" className={styles.createButton}>
            + Create Rule
          </Link>
        </div>

        <p className={styles.description}>
          Rules determine the expected action for findings based on context (category, images, price, etc.).
          Rules are evaluated in priority order; the first matching rule wins.
        </p>

        {rules.length === 0 ? (
          <p className={styles.empty}>No rules yet. Create one to get started.</p>
        ) : (
          <div className={styles.list}>
            {rules.map((rule) => (
              <Card key={rule.id} padding={4} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemRuleId}>{rule.ruleId}</span>
                  <span className={rule.isActive ? styles.itemActive : styles.itemInactive}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className={styles.itemDetails}>
                  <span className={styles.itemDimension}>{rule.dimension}</span>
                  <span className={styles.itemSeverity}>{rule.severity}</span>
                  <span className={styles.itemPriority}>Priority: {rule.priority}</span>
                </div>
                <div className={styles.itemActions}>
                  <Link href={`/admin/simulators/listing-audit/rules/${rule.id}/edit`} className={styles.actionButton}>
                    Edit
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
