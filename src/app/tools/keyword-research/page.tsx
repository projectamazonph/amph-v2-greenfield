/**
 * /tools/keyword-research — student-facing simulator page.
 *
 * Scenario from docs/ui-specs/STITCH-PROMPTS.md §23:
 * "Keyword research for the bamboo cutting board niche.
 *  25 seed terms, expand, categorize, ship to a campaign."
 *
 * Reuses the ListingAuditSimulator's keyword generation.
 */

import { buildContainer } from "@/composition/container";
import { KeywordResearchForm } from "@/components/tools/KeywordResearchForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SCENARIO = {
  title: "Keyword research for bamboo cutting board niche",
  brief:
    "Enter a product niche and generate a prioritized keyword list. Filter by priority, check search volume, and export to a campaign brief.",
  seedNiche: "bamboo cutting board",
};

export default async function KeywordResearchPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("listing-audit");
  if (!sim) {
    throw new Error("Listing Audit simulator not registered");
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <a href="/tools">← Tools</a>
        <span aria-hidden="true"> / </span>
        <span>Keyword Research</span>
      </nav>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Simulator</span>
        <h1 className={styles.title}>{SCENARIO.title}</h1>
        <p className={styles.brief}>{SCENARIO.brief}</p>
      </header>
      <KeywordResearchForm initialNiche={SCENARIO.seedNiche} />
    </main>
  );
}
