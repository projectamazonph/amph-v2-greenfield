/**
 * /portfolio — the learner's evidence home (LEARN-035).
 *
 * Server component. Lists the caller's artefacts newest-first with
 * kind, title, status, and date. Enforcement lives in
 * `ListStudentArtefacts` (owner-scoped); this page only displays.
 * No simulator percentage is labelled as certification.
 */

import Link from "next/link";
import { StudentShell } from "@/components/student/StudentShell";
import { Card, Badge } from "@astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  "decision-log": "Decision log",
  "listing-audit": "Listing audit",
  "keyword-plan": "Keyword plan",
  "campaign-map": "Campaign map",
  "triage-report": "Triage report",
  "weekly-readout": "Weekly readout",
};

export default async function PortfolioPage() {
  const user = await requireAuth();
  const container = buildContainer();
  const result = await container.listStudentArtefacts.execute({ actorId: user.id });

  if (!result.ok) {
    return (
      <StudentShell user={user}>
        <main id="main-content" tabIndex={-1} className={styles.page}>
          <header className={styles.header}>
            <div>
              <span className={styles.eyebrow}>Your work</span>
              <h1 className={styles.title}>Portfolio</h1>
            </div>
          </header>
          <Card padding={6}>
            <div className={styles.stateBlock}>
              <p className={styles.empty} role="alert">
                We could not load your portfolio right now. Nothing is lost. Refresh to try again.
              </p>
              <Link href="/dashboard" className={styles.stateLink}>
                Return to dashboard
              </Link>
            </div>
          </Card>
        </main>
      </StudentShell>
    );
  }

  const rows = result.value;

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Your work</span>
            <h1 className={styles.title}>Portfolio</h1>
            <p className={styles.subtitle}>
              Every decision log, audit, plan, map, report, and readout you saved. Practice scores
              stay formative; this page shows the work behind them.
            </p>
          </div>
          {rows.length > 0 ? (
            <Link href="/portfolio/export" className={styles.exportLink}>
              Export as JSON
            </Link>
          ) : null}
        </header>

        {rows.length === 0 ? (
          <Card padding={6}>
            <p className={styles.empty} role="status">
              Nothing saved yet. Finish a simulator attempt and save the rationale, and it shows up
              here.
            </p>
          </Card>
        ) : (
          <ul className={styles.list}>
            {rows.map((artefact) => (
              <li key={artefact.id}>
                <Card padding={6}>
                  <div className={styles.cardHead}>
                    <h2 className={styles.cardTitle}>{artefact.title}</h2>
                    <Badge
                      variant="neutral"
                      label={artefact.status === "SUBMITTED" ? "Submitted" : "Draft"}
                    />
                  </div>
                  <p className={styles.meta}>
                    {KIND_LABELS[artefact.kind] ?? artefact.kind}
                    {" · "}
                    {artefact.createdAt.toLocaleDateString("en-PH")}
                  </p>
                  <Link href={`/portfolio/${artefact.id}`} className={styles.detailLink}>
                    Open artefact
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </StudentShell>
  );
}
