/**
 * /dashboard/diagnostic — optional pre-course diagnostic (LEARN-010).
 *
 * Renders the static question set from `content/curriculum/diagnostic.json`
 * and posts answers to `submitDiagnosticAction`. The action scores the
 * answers against the rubric and redirects back to this page with the
 * chosen outcome in the query string. The page then reads the outcome
 * id from the URL and renders the plain-language recommendation by
 * looking the outcome up in the rubric (the answers themselves are
 * not kept on the URL — the diagnostic is recommendation-only).
 */

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireAuth } from "@/lib/auth";
import { loadDiagnosticManifest, type DiagnosticOutcome } from "@/app/actions/diagnostic.action";
import { DiagnosticForm } from "./DiagnosticForm";
import { submitDiagnosticAction } from "@/app/actions/diagnostic.action";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const ALLOWED_OUTCOMES: readonly DiagnosticOutcome[] = ["new", "familiar", "experienced"];

function isOutcome(value: string | null | undefined): value is DiagnosticOutcome {
  return typeof value === "string" && (ALLOWED_OUTCOMES as readonly string[]).includes(value);
}

interface DashboardDiagnosticPageProps {
  readonly searchParams?: Promise<{ outcome?: string }> | { outcome?: string };
}

export default async function DashboardDiagnosticPage({
  searchParams,
}: DashboardDiagnosticPageProps) {
  await requireAuth();
  const manifest = loadDiagnosticManifest();
  const resolved = searchParams ? await Promise.resolve(searchParams) : {};
  const outcomeParam = resolved.outcome;
  const outcomeView = isOutcome(outcomeParam)
    ? (manifest.rubric.outcomes.find((o) => o.id === outcomeParam) ?? null)
    : null;

  const fallback = manifest.rubric.outcomes.find((o) => o.id === manifest.rubric.fallbackOutcome);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{manifest.title}</h1>
        <p className={styles.intro}>{manifest.intro}</p>
      </header>

      {outcomeView && fallback ? (
        <Card padding="comfortable" className={styles.result}>
          <h2>{outcomeView.label}</h2>
          <p>{outcomeView.summary}</p>
          <p>
            <strong>Starting emphasis:</strong> {outcomeView.startingEmphasis}
          </p>
          <p className={styles.resultFooter}>
            Skipping this diagnostic keeps the default &ldquo;{fallback.label}&rdquo;
            recommendation. Your answers are private and never gate paid content or skip safety
            foundations.
          </p>
          <Link href="/dashboard" className={styles.dashboardLink}>
            Back to dashboard
          </Link>
        </Card>
      ) : (
        <DiagnosticForm manifest={manifest} action={submitDiagnosticAction} />
      )}
    </main>
  );
}
