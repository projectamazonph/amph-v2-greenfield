/**
 * /tools — student-facing tools index.
 *
 * Lists the 4 simulators with their names, descriptions, and a
 * link to open each one. Read from the registry so adding a new
 * simulator updates this page automatically.
 */

import { buildContainer } from "@/composition/container";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const TOOL_INFO: Record<string, { name: string; blurb: string; href: string }> = {
  "bid-elevator": {
    name: "Bid Elevator",
    blurb: "Move a slider, see how bid changes shift ACoS and sales in real time.",
    href: "/tools/bid-elevator",
  },
  "str-triage": {
    name: "Search Term Triage",
    blurb: "Triage 20 search terms from a real report. Keep, optimize, pause, or negate.",
    href: "/tools/str-triage",
  },
  "campaign-builder": {
    name: "Campaign Builder",
    blurb: "5-step wizard to build a Sponsored Products campaign from a brief.",
    href: "/tools/campaign-builder",
  },
  "listing-audit": {
    name: "Listing Audit",
    blurb: "Two steps: flag the issues, then revise the listing.",
    href: "/tools/listing-audit",
  },
};

export default async function ToolsIndexPage() {
  const container = buildContainer();
  const registered = container.simulatorRegistry.list();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Simulators</span>
        <h1 className={styles.title}>Tools</h1>
        <p className={styles.subhead}>
          {registered.length} practice tools. Pick one to start.
        </p>
      </header>
      <ul className={styles.grid}>
        {registered.map((sim) => {
          const info = TOOL_INFO[sim.simulatorId];
          if (!info) return null;
          return (
            <li key={sim.simulatorId} className={styles.card}>
              <h2 className={styles.cardName}>{info.name}</h2>
              <p className={styles.cardBlurb}>{info.blurb}</p>
              <a href={info.href} className={styles.cardLink}>
                Open tool →
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
