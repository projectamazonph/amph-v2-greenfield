/**
 * /tools/str-triage — student-facing simulator page.
 *
 * Loads a hardcoded scenario from the Stitch spec
 * (docs/ui-specs/STITCH-PROMPTS.md §21, "Clean up a broad match
 * campaign for kitchen products"), renders the 20 search terms
 * with a per-row action selector, and grades the user's
 * classification when they submit.
 */

import { buildContainer } from "@/composition/container";
import { StrTriageForm, type StrSeedRow } from "@/components/tools/StrTriageForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SCENARIO = {
  title: "Clean up a broad match campaign for kitchen products",
  brief:
    "Your Sponsored Products campaign is getting irrelevant clicks. Triage 20 search terms — keep the winners, pause the losers, negate the junk.",
  targetRoas: 3.33, // 30% ACoS
  rows: [
    { keyword: "stainless steel knife set", spend: 120, revenue: 480, orders: 8 },
    { keyword: "knife set", spend: 95, revenue: 285, orders: 5 },
    { keyword: "kitchen knife", spend: 80, revenue: 240, orders: 4 },
    { keyword: "knife block", spend: 60, revenue: 0, orders: 0 },
    { keyword: "steak knives", spend: 55, revenue: 165, orders: 3 },
    { keyword: "knife sharpener", spend: 40, revenue: 0, orders: 0 },
    { keyword: "wooden cutting board", spend: 35, revenue: 105, orders: 2 },
    { keyword: "cheap knives", spend: 30, revenue: 0, orders: 0 },
    { keyword: "kitchen scissors", spend: 28, revenue: 84, orders: 2 },
    { keyword: "knife holder", spend: 25, revenue: 0, orders: 0 },
    { keyword: "cutting board", spend: 22, revenue: 88, orders: 2 },
    { keyword: "kitchen knife set", spend: 22, revenue: 88, orders: 2 },
    { keyword: "pocket knife", spend: 20, revenue: 0, orders: 0 },
    { keyword: "kitchen shears", spend: 18, revenue: 36, orders: 1 },
    { keyword: "knife magnet", spend: 15, revenue: 0, orders: 0 },
    { keyword: "santoku knife", spend: 14, revenue: 56, orders: 1 },
    { keyword: "knife set with block", spend: 12, revenue: 60, orders: 1 },
    { keyword: "knife case", spend: 10, revenue: 0, orders: 0 },
    { keyword: "kitchen utensil set", spend: 8, revenue: 32, orders: 1 },
    { keyword: "knife holder magnetic", spend: 6, revenue: 0, orders: 0 },
  ] as const satisfies ReadonlyArray<StrSeedRow>,
};

export default async function StrTriagePage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    throw new Error("STR Triage simulator not registered");
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/tools">← Tools</a>
        <span aria-hidden="true"> / </span>
        <span>Search Term Triage</span>
      </nav>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Simulator</span>
        <h1 className={styles.title}>{SCENARIO.title}</h1>
        <p className={styles.brief}>{SCENARIO.brief}</p>
        <p className={styles.meta}>
          <span className={styles.metaLabel}>Target ROAS</span>
          <span className={styles.metaValue}>
            {SCENARIO.targetRoas.toFixed(2)}×
          </span>
          <span className={styles.metaDivider}>·</span>
          <span className={styles.metaLabel}>Search terms</span>
          <span className={styles.metaValue}>{SCENARIO.rows.length}</span>
        </p>
      </header>
      <StrTriageForm
        targetRoas={SCENARIO.targetRoas}
        initialRows={SCENARIO.rows}
      />
    </main>
  );
}
