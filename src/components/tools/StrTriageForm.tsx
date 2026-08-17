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
import { FormativeScoreNotice } from "./FormativeScoreNotice";
import { SimulatorModeToggle } from "./SimulatorModeToggle";
import { SimulatorNextRep } from "./SimulatorNextRep";
import type { PracticeOrChallengeMode } from "./SimulatorModeToggle";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";
import type { TriageAction } from "@/domain/simulator/str-triage/StrTriageOutput";
import { studentErrorCopy } from "@/lib/studentErrorCopy";

type StrScenario = Omit<StrTriageInput, "userClassifications">;

interface Props {
  scenario: StrScenario;
  challengeUnlocked: boolean;
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

export function StrTriageForm({ scenario, challengeUnlocked }: Props) {
  const [actions, setActions] = useState<Record<string, TriageAction>>(() =>
    Object.fromEntries(scenario.rows.map((r) => [r.searchTerm, "keep" as TriageAction])),
  );
  const [mode, setMode] = useState<PracticeOrChallengeMode>("practice");
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
      try {
        const r = await strTriageAttempt({ userActions: actions, mode });
        if (r.ok) {
          setResult(r.value);
        } else {
          setError("message" in r.error ? r.error.message : studentErrorCopy.simulatorGrade);
        }
      } catch {
        setError(studentErrorCopy.simulatorGrade);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <SimulatorModeToggle
        mode={mode}
        onChange={setMode}
        unlocked={challengeUnlocked}
        disabled={result !== null}
      />
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Search term triage"
        tabIndex={0}
      >
        <table className={styles.table}>
          {/* M-R30 fix: scope="col" on every header so screen readers
              associate cells with their column header (WCAG 1.3.1).
              The parent role="region" aria-label="Search term triage"
              supplies the accessible name. */}
          <thead>
            <tr>
              <th scope="col">Search term</th>
              <th scope="col" className={styles.thNum}>Spend</th>
              <th scope="col" className={styles.thNum}>Sales</th>
              <th scope="col" className={styles.thNum}>Orders</th>
              <th scope="col" className={styles.thNum}>ROAS</th>
              <th scope="col" className={styles.thAction}>Action</th>
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
                        {graded.isCorrect ? "Correct" : `Was: ${graded.groundTruth}`}
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
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.footer}>
        <button
          type="submit"
          className={styles.submit}
          disabled={pending || result !== null}
          aria-busy={pending}
        >
          {pending ? "Checking…" : result ? "Checked" : "Check my decisions"}
        </button>
        {result ? (
          // M-R33 fix (H-11): voice guide bans em-dashes; the previous
          // template used an em-dash separator and shipped a U+2014 to
          // the student. A colon (or period) is the canonical
          // voice-guide replacement.
          <div
            className={styles.score}
            role="status"
            aria-live="polite"
            style={{
              color:
                result.overallScore >= 80
                  ? "var(--success)"
                  : result.overallScore >= 50
                    ? "var(--warning)"
                    : "var(--danger)",
            }}
          >
            Score: {result.overallScore}%: {result.feedback.overallComment}
          </div>
        ) : null}
      </div>
      {result ? <FormativeScoreNotice /> : null}
      {result ? <SimulatorNextRep simulatorId="str-triage" /> : null}
      {result?.xpAwarded ? (
        <p className={styles.xpBanner}>
          +{result.xpAwarded} XP earned for passing in Challenge Mode.
        </p>
      ) : null}
    </form>
  );
}
