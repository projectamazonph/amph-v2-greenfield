/**
 * /admin/capstone — reviewer queue (LEARN-044).
 *
 * Server component behind requireAdmin. Lists every SUBMITTED
 * capstone oldest-first with learner, date, and artefact count.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function CapstoneQueuePage() {
  await requireAdmin();
  const container = buildContainer();
  const result = await container.listCapstoneReviewQueue.execute();

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Capstone review" />
        <main id="main-content" tabIndex={-1} className={styles.page}>
          <Card padding={6}>
            <p className={styles.empty} role="alert">
              We could not load the review queue right now. Refresh to try again.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  const rows = result.value;

  return (
    <div>
      <TopBar title="Capstone review" />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Human review</span>
            <h1 className={styles.title}>Capstone queue</h1>
            <p className={styles.subtitle}>
              Oldest submitted first. Open a row to read the six artefacts against the rubric, then
              return for revision or pass.
            </p>
          </div>
        </header>

        {rows.length === 0 ? (
          <Card padding={6}>
            <p className={styles.empty} role="status">
              Nothing waiting. Submitted capstones show up here.
            </p>
          </Card>
        ) : (
          <ul className={styles.list}>
            {rows.map((submission) => (
              <li key={submission.id}>
                <Card padding={6}>
                  <div className={styles.cardHead}>
                    <h2 className={styles.cardTitle}>{submission.userId}</h2>
                  </div>
                  <p className={styles.meta}>
                    Submitted {submission.submittedAt?.toLocaleDateString("en-PH") ?? "—"}
                    {" · "}
                    {submission.artefactIds.length} artefacts
                  </p>
                  <Link href={`/admin/capstone/${submission.id}`} className={styles.detailLink}>
                    Open review
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
