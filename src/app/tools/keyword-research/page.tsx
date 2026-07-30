/**
 * /tools/keyword-research — student-facing simulator page.
 *
 * STORY-081: Keyword Research is its own registered simulator (see
 * src/domain/simulator/keyword-research/), no longer a page reusing
 * ListingAuditSimulator's hardcoded keyword generator.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
import { KeywordResearchForm } from "@/components/tools/KeywordResearchForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SCENARIO = {
  title: "Keyword research for bamboo cutting board niche",
  brief:
    "Enter a product niche to generate its keyword set, classify each keyword's search intent, flag negatives, and submit for grading against the dataset's own labels.",
  seedNiche: "bamboo-cutting-board",
};

export default async function KeywordResearchPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("keyword-research");
  if (!sim) {
    throw new Error("Keyword Research simulator not registered");
  }

  return (
    <StudentShell>
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/tools">← Tools</Link>
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
    </StudentShell>
  );
}
