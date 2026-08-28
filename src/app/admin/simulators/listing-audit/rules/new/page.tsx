/**
 * /admin/simulators/listing-audit/rules/new - Create new Listing Audit Rule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/astryxdesign/core";
import { createListingAuditRuleAction } from "@/app/actions/ListingAuditRule";
import { RuleDimension, FindingSeverity, FindingAction, CategoryVariant } from "@/domain/simulator/listing-audit/ListingAuditOutput";
import type { RuleConditionType } from "@/domain/entities/ListingAuditRule";
import styles from "./page.module.css";

const DIMENSIONS: RuleDimension[] = ["compliance", "relevance", "accuracy", "conversion", "mobile", "imagery"];
const SEVERITIES: FindingSeverity[] = ["info", "warning", "critical"];
const ACTIONS: FindingAction[] = ["fixNow", "defer", "skip", "escalate"];
const CATEGORIES: CategoryVariant[] = ["general_home", "beauty", "food_supplements", "electronics", "apparel"];
const CONDITION_TYPES: RuleConditionType[] = [
  "category_equals", "category_in", "images_count_gte", "images_count_lte",
  "has_a_plus", "has_video", "price_gte", "price_lte",
  "seasonal_period", "attribute_present", "attribute_equals"
];

const ACTION_LABELS: Record<FindingAction, string> = {
  fixNow: "Fix Now",
  defer: "Defer",
  skip: "Skip",
  escalate: "Escalate",
} as const;

const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
} as const;

const DIMENSION_LABELS: Record<RuleDimension, string> = {
  compliance: "Compliance",
  relevance: "Relevance",
  accuracy: "Accuracy",
  conversion: "Conversion",
  mobile: "Mobile",
  imagery: "Imagery",
} as const;

export default async function NewListingAuditRulePage() {
  await requireAdmin();

  return (
    <div>
      <TopBar title="Create Rule" subtitle="Add a new context-aware ground truth rule" />
      
      <Card padding={6} className={styles.card}>
        <h2 className={styles.title}>Create Listing Audit Rule</h2>
        <p className={styles.description}>
          Define a rule that determines the expected action for findings based on context.
        </p>

        <form action={createListingAuditRuleAction} className={styles.form}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Rule Identification</h3>
            
            <div className={styles.field}>
              <label htmlFor="ruleId" className={styles.label}>
                Rule ID *
              </label>
              <input
                type="text"
                id="ruleId"
                name="ruleId"
                className={styles.input}
                placeholder="e.g., title_too_long"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="dimension" className={styles.label}>
                Dimension *
              </label>
              <select id="dimension" name="dimension" className={styles.select} required>
                <option value="">Select dimension</option>
                {DIMENSIONS.map((d) => (
                  <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="severity" className={styles.label}>
                Severity *
              </label>
              <select id="severity" name="severity" className={styles.select} required>
                <option value="">Select severity</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Action Configuration</h3>
            
            <div className={styles.field}>
              <label htmlFor="action" className={styles.label}>
                Primary Action *
              </label>
              <select id="action" name="action" className={styles.select} required>
                <option value="">Select action</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="acceptedActions" className={styles.label}>
                Accepted Actions *
              </label>
              <div className={styles.checkboxGroup}>
                {ACTIONS.map((a) => (
                  <label key={a} className={styles.checkboxLabel}>
                    <input type="checkbox" name="acceptedActions" value={a} defaultChecked={a === "fixNow"} />
                    <span>{ACTION_LABELS[a]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="rationale" className={styles.label}>
                Rationale *
              </label>
              <textarea
                id="rationale"
                name="rationale"
                className={styles.textarea}
                placeholder="Explain why this action is correct for this context"
                rows={3}
                required
              />
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Context Conditions</h3>
            <p className={styles.sectionDescription}>
              Add conditions that must be true for this rule to apply. Leave empty for rules that always apply.
            </p>
            
            <div className={styles.field}>
              <label htmlFor="applicableCategories" className={styles.label}>
                Applicable Categories
              </label>
              <div className={styles.checkboxGroup}>
                {CATEGORIES.map((c) => (
                  <label key={c} className={styles.checkboxLabel}>
                    <input type="checkbox" name="applicableCategories" value={c} />
                    <span>{c.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Conditions
              </label>
              <div className={styles.conditionsGrid}>
                <div className={styles.conditionRow}>
                  <select name="conditionType" className={styles.select}>
                    <option value="">Add condition...</option>
                    {CONDITION_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ")}</option>
                    ))}
                  </select>
                  <input type="text" name="conditionValue" className={styles.input} placeholder="Value" />
                  <button type="button" className={styles.addButton}>+</button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Rule Settings</h3>
            
            <div className={styles.field}>
              <label htmlFor="priority" className={styles.label}>
                Priority (lower = higher priority)
              </label>
              <input
                type="number"
                id="priority"
                name="priority"
                className={styles.input}
                defaultValue={0}
                min={0}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" name="isActive" defaultChecked className={styles.checkbox} />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton}>
              Create Rule
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
