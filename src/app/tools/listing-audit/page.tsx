/**
 * /tools/listing-audit — student-facing simulator page.
 *
 * Scenario from docs/ui-specs/STITCH-PROMPTS.md §22, §23:
 * Bamboo Cutting Board listing audit + keyword research.
 */

import { buildContainer } from "@/composition/container";
import { ListingAuditForm } from "@/components/tools/ListingAuditForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SCENARIO = {
  title: "Bamboo Cutting Board — Premium Kitchen Essential",
  brief:
    "Audit this listing and revise the fields you think have problems. Get a score and a keyword research list.",
  category: "Kitchen",
  niche: "bamboo cutting board",
  bullets: [
    "100% organic bamboo, sustainable and food-safe",
    "Knife-friendly surface that won't dull your blades",
    "Easy to clean — hand wash with soap and water",
  ],
  description:
    "High-quality bamboo cutting board for home cooks and professional chefs. Durable, knife-friendly, and naturally beautiful.",
};

export default async function ListingAuditPage() {
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
        <span>Listing Audit</span>
      </nav>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Simulator</span>
        <h1 className={styles.title}>{SCENARIO.title}</h1>
        <p className={styles.brief}>{SCENARIO.brief}</p>
      </header>
      <ListingAuditForm
        initialTitle={SCENARIO.title}
        initialBullets={SCENARIO.bullets}
        initialDescription={SCENARIO.description}
        category={SCENARIO.category}
        niche={SCENARIO.niche}
      />
    </main>
  );
}
