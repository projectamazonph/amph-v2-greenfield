/**
 * /capstone — Foundations capstone status (LEARN-043).
 *
 * Server component. Reads the brief, the caller's readiness, and
 * their latest submission row. Renders the six deliverables with
 * done/missing markers, the reviewer note when returned, and a
 * submit form only when ready and unsubmitted. Passing awards
 * completion evidence, never an employment claim.
 */

import { StudentShell } from "@/components/student/StudentShell";
import { Card, Badge } from "@astryxdesign/core";
import { buildContainer } from "@/composition/container";
import { requireAuth } from "@/lib/auth";
import { loadCapstoneManifest } from "@/lib/capstone";
import { SubmitCapstoneButton } from "./SubmitCapstoneButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function CapstonePage() {
  const user = await requireAuth();
  const container = buildContainer();
  const manifest = loadCapstoneManifest();
  const status = await container.getCapstoneStatus.execute({
    actorId: user.id,
    requiredKinds: manifest.deliverables.map((d) => d.artefactKind),
  });

  if (!status.ok) {
    return (
      <StudentShell user={user}>
        <main id="main-content" tabIndex={-1} className={styles.page}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>Capstone</span>
            <h1 className={styles.title}>{manifest.title}</h1>
          </header>
          <Card padding={6}>
            <p className={styles.empty} role="alert">
              We could not load your capstone status right now. Nothing is lost.
            </p>
          </Card>
        </main>
      </StudentShell>
    );
  }

  const { submission, ready, missingKinds } = status.value;
  const submittedKinds = new Set(status.value.submittedKinds);
  const showSubmit = ready && (submission === null || submission.status === "NEEDS_REVISION");

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Capstone</span>
          <h1 className={styles.title}>{manifest.title}</h1>
          <p className={styles.subtitle}>{manifest.intro}</p>
        </header>

        {submission && submission.status === "PASSED" ? (
          <Card padding={6}>
            <p className={styles.passed} role="status">
              Passed. Your six deliverables are on record as completed study and submitted work.
            </p>
          </Card>
        ) : null}

        {submission && submission.status === "SUBMITTED" ? (
          <Card padding={6}>
            <p className={styles.pending} role="status">
              Submitted and waiting for review. You will see the reviewer note here if changes are
              requested.
            </p>
          </Card>
        ) : null}

        {submission && submission.status === "NEEDS_REVISION" && submission.reviewerNote ? (
          <Card padding={6}>
            <h2 className={styles.cardTitle}>Reviewer note</h2>
            <p className={styles.note}>{submission.reviewerNote}</p>
          </Card>
        ) : null}

        <Card padding={6}>
          <h2 className={styles.cardTitle}>Required deliverables</h2>
          <ul className={styles.list}>
            {manifest.deliverables.map((deliverable) => {
              const done = submittedKinds.has(deliverable.artefactKind);
              return (
                <li key={deliverable.id} className={styles.row}>
                  <Badge variant="neutral" label={done ? "Saved" : "Missing"} />
                  <div>
                    <strong>{deliverable.label}</strong>
                    <p className={styles.summary}>{deliverable.summary}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {!ready ? (
            <p className={styles.missing} role="status">
              Missing: {missingKinds.join(", ")}. Save each one to your portfolio first — the submit
              button appears when all six are SUBMITTED.
            </p>
          ) : null}
          {showSubmit ? <SubmitCapstoneButton /> : null}
        </Card>

        <Card padding={6}>
          <h2 className={styles.cardTitle}>How you are scored</h2>
          <p className={styles.subtitle}>
            Each deliverable scores 0 to 2. You pass at {manifest.rubric.passThreshold} of{" "}
            {manifest.rubric.criteria.length * manifest.rubric.pointsPerCriterion}. Passing records
            completion evidence, not a job guarantee.
          </p>
          <ul className={styles.list}>
            {manifest.rubric.criteria.map((criterion) => (
              <li key={criterion.id} className={styles.row}>
                <div>
                  <strong>{criterion.label}</strong>
                  <p className={styles.summary}>{criterion.goodLooksLike}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </StudentShell>
  );
}
