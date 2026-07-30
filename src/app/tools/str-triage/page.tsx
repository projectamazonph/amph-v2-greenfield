/**
 * /tools/str-triage — student-facing simulator page.
 *
 * STORY-082: Expand STR Triage classifier. Scenario now carries the full
 * search-term-report schema plus the economics needed for
 * targetCpa/zero-order thresholds, existing-target detection, and
 * per-brand-class target ROAS. See docs/stories/STORY-082.md.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { StrTriageForm } from "@/components/tools/StrTriageForm";
import { StudentShell } from "@/components/student/StudentShell";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type StrScenario = Omit<StrTriageInput, "userClassifications">;

const SCENARIO: { title: string; brief: string } & StrScenario = {
  title: "Clean up a broad match campaign for kitchen products",
  brief:
    "Your Sponsored Products campaign is getting broad-match spillover. Triage each search term: harvest the winners, pause or negate the losers, and flag what still needs more time.",
  averageOrderValue: 30,
  expectedCtrPct: 4,
  expectedCvrPct: 5,
  brandTargetRoas: 5,
  genericTargetRoas: 3,
  competitorTargetRoas: 4,
  confidenceLevel: 0.8,
  minElapsedDays: 7,
  minOrdersForWinner: 2,
  brandLexicon: ["homechef"],
  competitorBrandLexicon: ["cutco"],
  incompatibleAttributeLexicon: ["left handed"],
  sourceCampaignRole: "research",
  existingTargets: [
    {
      text: "stainless steel knife set",
      normalizedText: "stainless steel knife set",
      matchType: "exact",
      campaignId: "camp-performance-kitchen-1",
      adGroupId: "ag-performance-1",
      campaignRole: "performance",
      state: "enabled",
    },
    {
      text: "kitchen knife",
      normalizedText: "kitchen knife",
      matchType: "broad",
      campaignId: "camp-research-kitchen-1",
      adGroupId: "ag-broad-kitchen",
      campaignRole: "research",
      state: "enabled",
    },
  ],
  rows: [
    {
      searchTerm: "stainless steel knife set",
      impressions: 6000,
      clicks: 300,
      spend: 120,
      orders: 8,
      sales: 480,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "kitchen knife",
      impressions: 5000,
      clicks: 250,
      spend: 95,
      orders: 5,
      sales: 285,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "cutting board oil",
      impressions: 900,
      clicks: 45,
      spend: 60,
      orders: 0,
      sales: 0,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "cheap knives",
      impressions: 900,
      clicks: 45,
      spend: 30,
      orders: 0,
      sales: 0,
      elapsedDays: 3,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "wooden cutting board",
      impressions: 1200,
      clicks: 60,
      spend: 30,
      orders: 2,
      sales: 90,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "homechef knife set",
      impressions: 1200,
      clicks: 60,
      spend: 30,
      orders: 3,
      sales: 150,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "cutco knife sharpener",
      impressions: 1000,
      clicks: 50,
      spend: 20,
      orders: 2,
      sales: 80,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "cutco replacement blade",
      impressions: 1000,
      clicks: 50,
      spend: 25,
      orders: 3,
      sales: 150,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "kitchen shears",
      impressions: 900,
      clicks: 45,
      spend: 20,
      orders: 2,
      sales: 40,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "plastic spoon rest",
      impressions: 900,
      clicks: 45,
      spend: 20,
      orders: 0,
      sales: 0,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "plastic ladle holder",
      impressions: 900,
      clicks: 45,
      spend: 20,
      orders: 0,
      sales: 0,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "plastic trivet mat",
      impressions: 900,
      clicks: 45,
      spend: 20,
      orders: 0,
      sales: 0,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "utensil drying rack",
      impressions: 900,
      clicks: 45,
      spend: 20,
      orders: 0,
      sales: 0,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
    {
      searchTerm: "left handed knife set",
      impressions: 900,
      clicks: 45,
      spend: 20,
      orders: 0,
      sales: 0,
      elapsedDays: 14,
      sourceCampaignId: "camp-research-kitchen-1",
      sourceAdGroupId: "ag-broad-kitchen",
      sourceTarget: "kitchen knives",
      sourceMatchType: "broad",
    },
  ],
};

export default async function StrTriagePage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    throw new Error("STR Triage simulator not registered");
  }

  const { title, brief, ...scenario } = SCENARIO;

  return (
    <StudentShell>
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/tools">← Tools</Link>
          <span aria-hidden="true"> / </span>
          <span>Search Term Triage</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulator</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.brief}>{brief}</p>
          <p className={styles.meta}>
            <span className={styles.metaLabel}>Target ROAS (generic)</span>
            <span className={styles.metaValue}>{scenario.genericTargetRoas.toFixed(2)}×</span>
            <span className={styles.metaDivider}>·</span>
            <span className={styles.metaLabel}>Search terms</span>
            <span className={styles.metaValue}>{scenario.rows.length}</span>
          </p>
        </header>
        <StrTriageForm scenario={scenario} />
      </main>
    </StudentShell>
  );
}
