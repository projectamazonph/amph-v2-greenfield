/**
 * /tools — student-facing tools index.
 *
 * Lists the 5 registered simulators (from the registry) plus the
 * embedded Amazon Ad Console, with names, descriptions, and a link
 * to open each one. ad-console is added manually — it isn't a
 * simulator, so it has no registry entry.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
import { getSimulatorCopy } from "@/lib/copy/simulatorCopy";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const TOOL_INFO: Record<string, { name: string; href: string }> = {
  "bid-elevator": {
    name: "Bid Elevator",
    href: "/tools/bid-elevator",
  },
  "str-triage": {
    name: "Search Term Triage",
    href: "/tools/str-triage",
  },
  "campaign-builder": {
    name: "Campaign Builder",
    href: "/tools/campaign-builder",
  },
  "listing-audit": {
    name: "Listing Audit",
    href: "/tools/listing-audit",
  },
  "keyword-research": {
    name: "Keyword Research",
    href: "/tools/keyword-research",
  },
};

export default async function ToolsIndexPage() {
  const container = buildContainer();
  const registered = container.simulatorRegistry.list();

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Practice tools</span>
          <h1 className={styles.title}>Tools</h1>
          <p className={styles.subhead}>
            Five practice simulators. Use the live console only when you are ready to make real
            account changes.
          </p>
        </header>
        <ul className={styles.grid}>
          {registered.map((sim) => {
            const info = TOOL_INFO[sim.simulatorId];
            if (!info) return null;
            return (
              <li key={sim.simulatorId} className={styles.card}>
                <h2 className={styles.cardName}>{info.name}</h2>
                <p className={styles.cardBlurb}>{getSimulatorCopy(sim.simulatorId).outcome}</p>
                <Link href={info.href} className={styles.cardLink} prefetch>
                  Start practice
                </Link>
              </li>
            );
          })}
          {/* Amazon Ad Console — embedded external tool, not a registered simulator */}
          <li key="ad-console" className={styles.card}>
            <h2 className={styles.cardName}>Amazon Ad Console</h2>
            <p className={styles.cardBlurb}>
              A live campaign console for your own Amazon Advertising account. Changes affect real
              data and real ad spend.
            </p>
            <Link href="/tools/ad-console" className={styles.cardLink}>
              Open live console
            </Link>
          </li>
        </ul>
      </main>
    </StudentShell>
  );
}
