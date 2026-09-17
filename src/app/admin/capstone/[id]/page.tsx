/**
 * /admin/capstone/[id] — single review (LEARN-044).
 *
 * Server component behind requireAdmin. Shows the six artefacts
 * with the rubric criteria beside each one, plus return-for-
 * revision and pass forms. Every reviewer action is audited in
 * its use case.
 */

import { notFound } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { LearnerArtefact } from "@/domain/entities/LearnerArtefact";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { loadCapstoneManifest } from "@/lib/capstone";
import { ReturnCapstoneForm } from "./ReturnCapstoneForm";
import { PassCapstoneButton } from "./PassCapstoneButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CapstoneReviewPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const container = buildContainer();
  const manifest = loadCapstoneManifest();

  const found = await container.capstoneRepo.findById(id);
  if (!found.ok || !found.value) {
    notFound();
  }
  const submission = found.value;

  const artefactResults = await Promise.all(
    submission.artefactIds.map((artefactId) => container.artefactRepo.findById(artefactId)),
  );
  const rows: LearnerArtefact[] = [];
  for (const r of artefactResults) {
    if (r.ok && r.value !== null) rows.push(r.value);
  }

  const criteriaByKind = new Map(manifest.rubric.criteria.map((c) => [c.artefactKind, c] as const));

  return (
    <div>
      <TopBar title="Capstone review" />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Review · {submission.status}</span>
          <h1 className={styles.title}>{submission.userId}</h1>
          <p className={styles.subtitle}>
            Submitted {submission.submittedAt?.toLocaleDateString("en-PH") ?? "—"} · {rows.length}{" "}
            of {submission.artefactIds.length} artefacts found
          </p>
        </header>

        {rows.map((artefact) => {
          const criterion = criteriaByKind.get(artefact.kind);
          return (
            <Card key={artefact.id} padding={6}>
              <h2 className={styles.cardTitle}>{artefact.title}</h2>
              <p className={styles.meta}>
                {artefact.kind} · {artefact.status}
              </p>
              <p className={styles.rationale}>{artefact.payload.rationale}</p>
              {criterion ? (
                <p className={styles.criterion}>
                  <strong>Rubric — {criterion.label}:</strong> {criterion.goodLooksLike}
                </p>
              ) : null}
            </Card>
          );
        })}

        {submission.status === "SUBMITTED" ? (
          <>
            <ReturnCapstoneForm submissionId={submission.id} />
            <PassCapstoneButton submissionId={submission.id} />
          </>
        ) : (
          <Card padding={6}>
            <p className={styles.empty} role="status">
              This submission is {submission.status}. Only SUBMITTED rows can be returned or passed.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
