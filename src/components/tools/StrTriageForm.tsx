/**
 * StrTriageForm — client component.
 *
 * Renders the 20 search terms as a table with a per-row action
 * selector. On submit, calls the classifyStr action and shows the
 * result in a sticky bottom panel.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./StrTriageForm.module.css";
import {
  classifyStr,
  type ClassifyStrRow,
  type ClassifyStrResult,
} from "@/app/tools/str-triage/actions";

export interface StrSeedRow {
  keyword: string;
  spend: number;
  revenue: number;
  orders: number;
}

interface Props {
  targetRoas: number;
  initialRows: ReadonlyArray<StrSeedRow>;
}

type Action = "keep" | "pause" | "add_as_exact" | "add_as_phrase";

const ACTIONS: ReadonlyArray<{ value: Action; label: string }> = [
  { value: "keep", label: "Keep" },
  { value: "add_as_exact", label: "Add as exact" },
  { value: "add_as_phrase", label: "Add as phrase" },
  { value: "pause", label: "Pause" },
];

function actionColor(a: Action): "var(--success)" | "var(--warning)" | "var(--danger)" | "var(--ink-500)" {
  if (a === "keep" || a === "add_as_exact" || a === "add_as_phrase") return "var(--success)";
  return "var(--danger)";
}

export function StrTriageForm({ targetRoas, initialRows }: Props) {
  const [actions, setActions] = useState<Record<string, Action>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.keyword, "keep" as Action])),
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ClassifyStrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setAction = (keyword: string, value: Action) => {
    setActions((prev) => ({ ...prev, [keyword]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rows: ClassifyStrRow[] = initialRows.map((r) => ({
      ...r,
      action: actions[r.keyword] ?? "keep",
    }));
    startTransition(async () => {
      const r = await classifyStr({ rows, targetRoas });
      if (r.ok) {
        setResult(r);
      } else {
        setError(r.error.message);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Search term</th>
            <th className={styles.thNum}>Spend</th>
            <th className={styles.thNum}>Revenue</th>
            <th className={styles.thNum}>ROAS</th>
            <th className={styles.thAction}>Action</th>
          </tr>
        </thead>
        <tbody>
          {initialRows.map((r) => {
            const roas = r.spend === 0 ? 0 : r.revenue / r.spend;
            const a = actions[r.keyword] ?? "keep";
            return (
              <tr key={r.keyword}>
                <td className={styles.tdKw}>{r.keyword}</td>
                <td className={styles.tdNum}>₱{r.spend.toFixed(0)}</td>
                <td className={styles.tdNum}>₱{r.revenue.toFixed(0)}</td>
                <td
                  className={styles.tdNum}
                  style={{
                    color:
                      roas >= targetRoas ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {roas.toFixed(2)}×
                </td>
                <td className={styles.tdAction}>
                  <select
                    value={a}
                    onChange={(e) => setAction(r.keyword, e.target.value as Action)}
                    className={styles.select}
                    style={{ color: actionColor(a) }}
                    aria-label={`Action for ${r.keyword}`}
                  >
                    {ACTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Grading…" : "Grade my triage"}
        </button>
        {result && result.ok ? (
          <div
            className={styles.score}
            style={{
              color:
                result.value.score >= 80
                  ? "var(--success)"
                  : result.value.score >= 50
                    ? "var(--warning)"
                    : "var(--danger)",
            }}
          >
            Score: {result.value.score}%
          </div>
        ) : null}
      </div>
    </form>
  );
}
