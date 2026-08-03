/**
 * /tools — student-facing tools index.
 *
 * Lists the 5 simulators with their names, descriptions, and a
 * link to open each one. The 4 registered simulators come from the
 * registry; keyword-research is added manually (it reuses the
 * listing-audit simulator).
 */

import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
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
  "keyword-research": {
    name: "Keyword Research",
    blurb: "Enter a niche, get a prioritized keyword list. Filter by volume and export.",
    href: "/tools/keyword-research",
  },
};

export default async function ToolsIndexPage() {
  const container = buildContainer();
  const registered = container.simulatorRegistry.list();

  return (
    <StudentShell>
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulators</span>
          <h1 className={styles.title}>Tools</h1>
          <p className={styles.subhead}>5 practice tools. Pick one to start.</p>
        </header>
        <section style={{ marginBottom: "var(--space-8)" }}>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-500)",
              marginBottom: "var(--space-4)",
            }}
          >
            Recently used
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                padding: "var(--space-4)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              Bid Elevator{" "}
              <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-500)" }}>
                · 2 hours ago
              </span>
            </div>
          </div>
        </section>
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
          {/* Keyword Research reuses the listing-audit simulator */}
          <li key="keyword-research" className={styles.card}>
            <h2 className={styles.cardName}>Keyword Research</h2>
            <p className={styles.cardBlurb}>
              Enter a niche, get a prioritized keyword list. Filter by volume and export.
            </p>
            <a href="/tools/keyword-research" className={styles.cardLink}>
              Open tool →
            </a>
          </li>
          {/* Amazon Ad Console — embedded external tool, not a registered simulator */}
          <li key="ad-console" className={styles.card}>
            <h2 className={styles.cardName}>Amazon Ad Console</h2>
            <p className={styles.cardBlurb}>
              Embedded, live campaign console for your own Amazon Advertising account. Real data,
              real changes — not a practice simulator.
            </p>
            <a href="/tools/ad-console" className={styles.cardLink}>
              Open tool →
            </a>
          </li>
        </ul>
      </main>
    </StudentShell>
  );
}
