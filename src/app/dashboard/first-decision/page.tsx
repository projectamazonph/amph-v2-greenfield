/**
 * /dashboard/first-decision — guided onboarding decision (LEARN-014).
 *
 * Reads the static brief from `content/curriculum/first-decision.json`
 * and renders the scenario context, the decision rule, and a "Start
 * the practice decision" button that links to the existing Bid
 * Elevator tool. The route is recommendation-only; no entitlement
 * changes.
 */

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireAuth } from "@/lib/auth";
import { loadFirstDecisionBrief } from "@/lib/firstDecision";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function FirstDecisionPage() {
  await requireAuth();
  const brief = loadFirstDecisionBrief();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{brief.title}</h1>
        <p className={styles.intro}>{brief.intro}</p>
      </header>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>The scenario</h2>
        <p>{brief.scenarioContext}</p>
      </Card>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>The decision rule</h2>
        <p>{brief.decisionRule}</p>
      </Card>

      <Card padding="comfortable">
        <h2 className={styles.sectionHeading}>How to read your result</h2>
        <p>{brief.resultExplanation}</p>
      </Card>

      <div className={styles.actions}>
        <Link href="/tools/bid-elevator?from=first-decision" className={styles.primaryAction}>
          Start the practice decision
        </Link>
        <Link href="/dashboard" className={styles.secondaryAction}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
