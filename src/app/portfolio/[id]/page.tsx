/**
 * /portfolio/[id] — single artefact detail (LEARN-035).
 *
 * Server component. Owner check: the artefact's userId must match
 * the session user, else notFound. Renders kind, title, status,
 * scenario ref, rationale, and extra fields.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtefactDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const container = buildContainer();
  const result = await container.artefactRepo.findById(id);

  if (!result.ok || !result.value || result.value.userId !== user.id) {
    notFound();
  }
  const artefact = result.value;

  return (
    <StudentShell user={user}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{KIND_LABELS[artefact.kind] ?? artefact.kind}</span>
            <h1 className={styles.title}>{artefact.title}</h1>
            <p className={styles.subtitle}>
              {artefact.status === "SUBMITTED" ? "Submitted" : "Draft"}
              {" · "}
              {artefact.createdAt.toLocaleDateString("en-PH")}
              {artefact.scenarioRef ? ` · ${artefact.scenarioRef}` : ""}
            </p>
          </div>
          <Badge
            variant="neutral"
            label={artefact.status === "SUBMITTED" ? "Submitted" : "Draft"}
          />
        </header>

        <Card padding={6}>
          <h2 className={styles.cardTitle}>Rationale</h2>
          <p className={styles.rationale}>{artefact.payload.rationale}</p>
          {artefact.payload.fields && Object.keys(artefact.payload.fields).length > 0 ? (
            <dl className={styles.fields}>
              {Object.entries(artefact.payload.fields).map(([key, value]) => (
                <div key={key} className={styles.fieldRow}>
                  <dt className={styles.fieldKey}>{key}</dt>
                  <dd className={styles.fieldValue}>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Card>

        <Link href="/portfolio" className={styles.stateLink}>
          Back to portfolio
        </Link>
      </main>
    </StudentShell>
  );
}
