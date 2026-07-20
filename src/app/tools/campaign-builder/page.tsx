/**
 * /tools/campaign-builder — student-facing simulator page.
 *
 * Scenario from docs/ui-specs/STITCH-PROMPTS.md §19:
 * "Launch a Sponsored Products campaign for wireless earbuds."
 * Form takes 4 inputs: product, niche, monthly budget, targeting.
 */

import { buildContainer } from "@/composition/container";
import { CampaignBuilderForm } from "@/components/tools/CampaignBuilderForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SCENARIO = {
  title: "Launch a Sponsored Products campaign for wireless earbuds",
  brief:
    "Build a complete SP campaign with manual targeting, exact + phrase keywords, and a ₱500/day budget.",
  productCategory: "Electronics",
  productNiche: "wireless earbuds",
  monthlyBudget: 15000, // ₱500/day × 30
};

export default async function CampaignBuilderPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("campaign-builder");
  if (!sim) {
    throw new Error("Campaign Builder simulator not registered");
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/tools">← Tools</a>
        <span aria-hidden="true"> / </span>
        <span>Campaign Builder</span>
      </nav>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Simulator</span>
        <h1 className={styles.title}>{SCENARIO.title}</h1>
        <p className={styles.brief}>{SCENARIO.brief}</p>
      </header>
      <CampaignBuilderForm
        productCategory={SCENARIO.productCategory}
        productNiche={SCENARIO.productNiche}
        monthlyBudget={SCENARIO.monthlyBudget}
      />
    </main>
  );
}
