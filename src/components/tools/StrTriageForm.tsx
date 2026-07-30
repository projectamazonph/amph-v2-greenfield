/**
 * StrTriageForm — client component.
 *
 * STORY-082: renders each search term with a 7-action selector (harvest
 * exact/phrase, keep, pause, negative exact/phrase, insufficient data).
 * On submit, calls strTriageAttempt() (full grading lifecycle) and reveals
 * ground truth + correctness per row.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./StrTriageForm.module.css";
import { strTriageAttempt, type StrTriageAttemptResult } from "@/app/tools/str-triage/actions";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";
import type { TriageAction } from "@/domain/simulator/str-triage/StrTriageOutput";

type StrScenario = Omit<StrTriageInput, "userClassifications">;

interface Props {
  scenario: StrScenario;
}

const ACTIONS: ReadonlyArray<{ value: TriageAction; label: string }> = [
  { value: "harvest_exact", label: "Harvest: Exact" },
  { value: "harvest_phrase", label: "Harvest: Phrase" },
  { value: "keep", label: "Keep" },
  { value: "pause", label: "Pause" },
  { value: "negative_exact", label: "Negative: Exact" },
  { value: "negative_phrase", label: "Negative: Phrase" },
  { value: "insufficient_data", label: "Insufficient data" },
];

function actionColor(a: TriageAction): string {
  if (a === "harvest_exact" || a === "harvest_phrase" || a === "keep") return "var(--success)";
  if (a === "pause") return "var(--warning)";
  if (a === "insufficient_data") return "var(--ink-500)";
  return "var(--danger)"; // negative_exact / negative_phrase
}

export function StrTriageForm({ scenario }: Props) {
  const [actions, setActions] = useState<Record<string, TriageAction>>(() =>
    Object.fromEntries(scenario.rows.map((r) => [r.searchTerm, "keep" as TriageAction])),
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StrTriageAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setAction = (searchTerm: string, value: TriageAction) => {
    setActions((prev) => ({ ...prev, [searchTerm]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await strTriageAttempt({ ...scenario, userActions: actions, mode: "practice" });
      if (r.ok) {
        setResult(r.value);
      } else {
        setError("message" in r.error ? r.error.message : "Could not grade this attempt.");
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Search term triage"
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Search term</th>
              <th className={styles.thNum}>Spend</th>
              <th className={styles.thNum}>Sales</th>
              <th className={styles.thNum}>Orders</th>
              <th className={styles.thNum}>ROAS</th>
              <th className={styles.thAction}>Action</th>
            </tr>
          </thead>
          <tbody>
            {scenario.rows.map((r) => {
              const roas = r.spend === 0 ? 0 : r.sales / r.spend;
              const a = actions[r.searchTerm] ?? "keep";
              const graded = result?.classifications.find((c) => c.searchTerm === r.searchTerm);
              return (
                <tr key={r.searchTerm}>
                  <td className={styles.tdKw}>{r.searchTerm}</td>
                  <td className={styles.tdNum}>₱{r.spend.toFixed(0)}</td>
                  <td className={styles.tdNum}>₱{r.sales.toFixed(0)}</td>
                  <td className={styles.tdNum}>{r.orders}</td>
                  <td className={styles.tdNum}>{roas.toFixed(2)}×</td>
                  <td className={styles.tdAction}>
                    {result && graded ? (
                      <span
                        className={styles.resultBadge}
                        data-correct={graded.isCorrect ? "true" : "false"}
                      >
                        {graded.isCorrect ? "✓ correct" : `✗ was ${graded.groundTruth}`}
                      </span>
                    ) : (
                      <select
                        value={a}
                        onChange={(e) => setAction(r.searchTerm, e.target.value as TriageAction)}
                        className={styles.select}
                        style={{ color: actionColor(a) }}
                        aria-label={`Action for ${r.searchTerm}`}
                      >
                        {ACTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        <button type="submit" className={styles.submit} disabled={pending || result !== null}>
          {pending ? "Grading…" : result ? "Graded" : "Grade my triage"}
        </button>
        {result ? (
          <div
            className={styles.score}
            style={{
              color:
                result.overallScore >= 80
                  ? "var(--success)"
                  : result.overallScore >= 50
                    ? "var(--warning)"
                    : "var(--danger)",
            }}
          >
            Score: {result.overallScore}% — {result.feedback.overallComment}
          </div>
        ) : null}
      </div>
    </form>
  );
}
